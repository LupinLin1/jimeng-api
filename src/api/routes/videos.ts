import _ from 'lodash';

import Request from '@/lib/request/Request.ts';
import Response from '@/lib/response/Response.ts';
import { tokenSplit } from '@/api/controllers/core.ts';
import { generateVideo, DEFAULT_MODEL } from '@/api/controllers/videos.ts';
import util from '@/lib/util.ts';
import logger from '@/lib/logger.ts';

export default {

    prefix: '/v1/videos',

    post: {

        '/generations': async (request: Request) => {
            const contentType = request.headers['content-type'] || '';
            const isMultiPart = contentType.startsWith('multipart/form-data');

            request
                .validate('body.model', v => _.isUndefined(v) || _.isString(v))
                .validate('body.prompt', _.isString)
                .validate('body.ratio', v => _.isUndefined(v) || _.isString(v))
                .validate('body.resolution', v => _.isUndefined(v) || _.isString(v))
                .validate('body.duration', v => {
                    if (_.isUndefined(v)) return true;
                    // 支持的时长: 4-15秒 (seedance-2.0), 4/8/12 (sora2), 5/10/12 (3.5-pro), 5/10 (其他模型)
                    // 统一支持 4-15 秒范围，各模型会根据自身能力验证
                    const minDuration = 4;
                    const maxDuration = 15;
                    // 对于 multipart/form-data，允许字符串类型的数字
                    if (isMultiPart && typeof v === 'string') {
                        const num = parseInt(v);
                        return num >= minDuration && num <= maxDuration;
                    }
                    // 对于 JSON，要求数字类型
                    return _.isFinite(v) && v >= minDuration && v <= maxDuration;
                })
                // file_paths: 支持 1-5 个素材（统一接口）
                // 可以是字符串数组 ["url1", "url2"] 或对象数组 [{type:"image",url:"url1"}, ...]
                .validate('body.file_paths', v => _.isUndefined(v) || (_.isArray(v) && v.length <= 5))
                .validate('body.filePaths', v => _.isUndefined(v) || (_.isArray(v) && v.length <= 5))
                // 新增：全能参考模式参数验证
                .validate('body.mode', v => _.isUndefined(v) || ['auto', 'first_last_frames', 'omni_reference'].includes(v))
                .validate('body.response_format', v => _.isUndefined(v) || _.isString(v))
                .validate('headers.authorization', _.isString);

            // 限制上传文件数量最多5个（与 file_paths 一致）
            const uploadedFiles = request.files ? _.values(request.files) : [];
            if (uploadedFiles.length > 5) {
                throw new Error('最多只能上传5个素材文件');
            }

            // refresh_token切分
            const tokens = tokenSplit(request.headers.authorization);
            // 随机挑选一个refresh_token
            const token = _.sample(tokens);

            const {
                model = DEFAULT_MODEL,
                prompt,
                ratio = "1:1",
                resolution = "720p",
                duration = 5,
                file_paths = [],
                filePaths = [],
                mode = "auto",
                response_format = "url"
            } = request.body;

            // 如果是 multipart/form-data，需要将字符串转换为数字
            const finalDuration = isMultiPart && typeof duration === 'string'
                ? parseInt(duration)
                : duration;

            // ========== 智能参数合并 ==========
            // 统一使用 file_paths 参数，支持多种输入格式
            const rawFilePaths = filePaths.length > 0 ? filePaths : file_paths;

            // 检测输入格式并转换为统一的 materials 格式
            let finalMaterials = [];
            if (rawFilePaths && rawFilePaths.length > 0) {
                // 判断输入格式：字符串数组 或 对象数组
                if (typeof rawFilePaths[0] === 'string') {
                    // 字符串数组格式：["url1", "url2"] → [{type:"image",url:"url1"}, ...]
                    finalMaterials = rawFilePaths.map((url: string) => ({
                        type: "image",
                        url: url
                    }));
                    logger.info(`检测到字符串格式的 file_paths，已自动转换为 materials 格式（${finalMaterials.length} 个素材）`);
                } else {
                    // 对象数组格式：已经是标准格式
                    finalMaterials = rawFilePaths;
                    logger.info(`检测到对象格式的 file_paths（${finalMaterials.length} 个素材）`);
                }
            }

            // ========== 日志记录 ==========
            if (finalMaterials.length > 0) {
                logger.info(`最终使用的 file_paths 数量: ${finalMaterials.length}`);
                // 统计素材类型
                const imageCount = finalMaterials.filter((m: any) => m.type === 'image').length;
                const videoCount = finalMaterials.filter((m: any) => m.type === 'video').length;
                logger.info(`素材类型统计: 图片${imageCount}个, 视频${videoCount}个`);
            }

            // 生成视频
            const videoUrl = await generateVideo(
                model,
                prompt,
                {
                    ratio,
                    resolution,
                    duration: finalDuration,
                    files: request.files, // 本地上传文件
                    mode,
                    materials: finalMaterials, // 统一使用 materials
                },
                token
            );

            // 根据response_format返回不同格式的结果
            if (response_format === "b64_json") {
                // 获取视频内容并转换为BASE64
                const videoBase64 = await util.fetchFileBASE64(videoUrl);
                return {
                    created: util.unixTimestamp(),
                    data: [{
                        b64_json: videoBase64,
                        revised_prompt: prompt
                    }]
                };
            } else {
                // 默认返回URL
                return {
                    created: util.unixTimestamp(),
                    data: [{
                        url: videoUrl,
                        revised_prompt: prompt
                    }]
                };
            }
        }

    }

}