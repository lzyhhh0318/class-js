const OSS = require('ali-oss');
const { v4: uuidv4 } = require('uuid');
const multiparty = require('multiparty');

const ALIYUN_CONFIG = {
  region: 'cn-beijing',
  endpoint: 'code-class-video.oss-cn-beijing.aliyuncs.com',
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
  bucket: 'code-class-video',
  cname: true,
  secure: true
};

const client = new OSS(ALIYUN_CONFIG);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    const form = new multiparty.Form();

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(500).json({ success: false, message: '解析表单失败' });
      }

      try {
        const file = files.file && files.file[0];
        if (!file) {
          return res.status(400).json({ success: false, message: '请选择要上传的文件' });
        }

        const course_id = fields.course_id && fields.course_id[0];
        const title = fields.title && fields.title[0];
        const start_at = fields.start_at && fields.start_at[0];

        if (!course_id) {
          return res.status(400).json({ success: false, message: '缺少 course_id 参数' });
        }

        const originalFilename = file.originalFilename;
        const extension = originalFilename.includes('.')
          ? originalFilename.substring(originalFilename.lastIndexOf('.'))
          : '.mp4';

        const fileName = uuidv4() + extension;
        const ossPath = `courses/${course_id}/${fileName}`;

        await client.put(ossPath, file.path);

        const videoUrl = `https://${ALIYUN_CONFIG.bucket}.oss-cn-shanghai.aliyuncs.com/${ossPath}`;

        res.status(200).json({
          success: true,
          videoUrl,
          fileName,
          courseId: course_id,
          title: title || fileName,
          startAt: start_at
        });

      } catch (error) {
        console.error('上传错误:', error);
        res.status(500).json({ success: false, message: error.message || '上传失败' });
      }
    });
  } else if (req.method === 'GET') {
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