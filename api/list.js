const OSS = require('ali-oss');

const ALIYUN_CONFIG = {
  region: 'cn-shanghai',
  endpoint: 'https://code-class-video.oss-cn-shanghai.aliyuncs.com',
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
  bucket: 'code-class-video',
  cname: false
};

const client = new OSS(ALIYUN_CONFIG);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const { courseId } = req.query;
      if (!courseId) {
        return res.status(400).json({ success: false, message: '缺少 courseId 参数' });
      }

      const result = await client.list({ prefix: `courses/${courseId}/` });
      const videos = result.objects.map(obj => ({
        url: `https://${ALIYUN_CONFIG.bucket}.oss-cn-shanghai.aliyuncs.com/${obj.name}`,
        name: obj.name.substring(obj.name.lastIndexOf('/') + 1),
        size: obj.size,
        lastModified: obj.lastModified
      }));

      res.status(200).json(videos);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  } else {
    res.status(405).json({ success: false, message: '不支持的请求方法' });
  }
};