/**
 * 原始质量视频URL功能测试示例
 *
 * 此示例展示如何测试自动获取原始质量视频URL的功能
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const API_KEY = process.env.JIMENG_TOKEN || 'your_token_here';

/**
 * 生成视频并检查URL质量
 */
async function testOriginVideo() {
  try {
    console.log('======================================');
    console.log('原始质量视频URL测试');
    console.log('======================================\n');

    // 1. 生成视频
    console.log('1. 生成视频...');
    const response = await axios.post(
      `${API_BASE}/v1/videos/generations`,
      {
        model: 'seedance-2.0',
        prompt: '一只猫在草地上奔跑',
        duration: 5
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        }
      }
    );

    // 2. 提取视频URL
    const videoUrl = response.data.data || response.data.url;

    if (!videoUrl) {
      console.error('❌ 未获取到视频URL');
      return;
    }

    console.log('✓ 视频生成成功\n');
    console.log('2. 视频URL:');
    console.log(`   ${videoUrl}\n`);

    // 3. 分析URL质量
    console.log('3. URL质量分析:');

    const hasOriginQuality = videoUrl.includes('br=6619') || videoUrl.includes('ds=12');
    const hasOriginKeyword = videoUrl.includes('origin');

    if (hasOriginQuality) {
      console.log('   ✓ 检测到原始质量标识参数 (br=6619 或 ds=12)');
    } else if (hasOriginKeyword) {
      console.log('   ✓ URL包含 "origin" 关键字');
    } else {
      console.log('   ⚠ URL可能不是原始质量，请检查服务日志');
    }

    // 4. 下载并验证文件大小
    console.log('\n4. 验证文件大小...');
    console.log('   正在下载视频...');

    const videoResponse = await axios.get(videoUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    const contentLength = videoResponse.data.byteLength;
    const sizeMB = (contentLength / (1024 * 1024)).toFixed(2);

    console.log(`   文件大小: ${sizeMB} MB`);

    if (contentLength > 3000000) {
      console.log('   ✓ 文件大小符合原始质量预期 (>3MB)');
    } else if (contentLength > 1000000) {
      console.log('   ⚠ 文件大小可能是中质量 (1-3MB)');
    } else {
      console.log('   ⚠ 文件大小较小，可能是低质量 (<1MB)');
    }

    console.log('\n======================================');
    console.log('测试完成');
    console.log('======================================\n');

    console.log('提示: 请查看服务日志以了解详细获取过程:');
    console.log('  - 检测到itemId: xxxxx');
    console.log('  - 尝试获取原始质量视频URL');
    console.log('  - ✓ 成功获取原始质量视频URL');
    console.log('  - 或 ✗ 无法获取原始URL,使用当前URL\n');

    return {
      url: videoUrl,
      size: contentLength,
      isOriginQuality: hasOriginQuality || hasOriginKeyword
    };

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
    throw error;
  }
}

// 运行测试
if (require.main === module) {
  testOriginVideo()
    .then(result => {
      console.log('测试结果:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('测试出错:', error.message);
      process.exit(1);
    });
}

module.exports = testOriginVideo;
