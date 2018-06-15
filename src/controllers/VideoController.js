import fs from 'fs';
import AWS from 'aws-sdk';
import ffmpeg from 'fluent-ffmpeg';
import Logger from '../helpers/Logger';

class VideoController {
  constructor(config) {
    this.config = config;
    AWS.config.update({
      accessKeyId: config.aws.key,
      secretAccessKey: config.aws.secret,
    });

    this.s3 = new AWS.S3();
  }

  post(req, res) {
    const data = {
      key: req.body.key.trim(),
    };
    try {
      this.processVideo(data);
      res.send({ success: true });
    } catch (err) {
      Logger.throw(res, '2365958507', err);
    }
  }

  processVideo(data, res) {
    try {
      console.log(data);
      console.log('process');
      const fileName = `${data.key}`;
      const key = `videos/${fileName}`;
      let file;
      try {
        file = fs.createWriteStream(`./tmp/videos/${fileName}`);
      } catch (e) {
        console.log(e);
      }
      const params = {
        Bucket: this.config.aws.bucket,
        Key: key,
      };

      console.log(key);

      this.s3.getObject(params).createReadStream()
        .on('error', (errS3) => {
          console.log(errS3);
        })
        .pipe(file)
        .on('finish', () => {
          console.log('start processing');
          const filePath = `./tmp/videos/${fileName}`;

          const newPath = `./tmp/videos/processed/${fileName}`;
          try {
            ffmpeg(filePath)
              .audioCodec('aac')
              .videoCodec('libx264')
              .format('mp4')
              .size('750x1334')
              .aspect('9:16')
              .autopad()
              .save(newPath)
              .videoBitrate(3500)
              .fps(29.7)
              .on('error', (err) => {
                console.log(err);
              })
              .on('end', () => {
                this.moveProcessedFile(newPath, fileName, res);
                console.log('moving');
              });
          } catch (e) {
            console.log(e);
          }
        });
    } catch (err) {
      console.log(err);
      Logger.throw(res, '2365958507', err);
    }
  }

  moveProcessedFile(filePath, fileName, res) {
    try {
      console.log('reading');
      fs.readFile(filePath, async (err, data) => {
        if (err) { throw err; }
        const base64data = Buffer.from(data, 'binary');
        const { bucket } = this.config.aws;
        const key = `videos/processed/${fileName}`;

        this.s3.putObject({
          Bucket: bucket,
          Key: key,
          Body: base64data,
        }, (e, result) => {
          console.log('move');
          if (e) {
            Logger.throw(res, '2365958507', err);
          }
          const file = {
            path: key,
            s3: result,
          };
          console.log(file);
          return file;
        });
      });
    } catch (err) {
      console.log(err);
      // Logger.throw(res, '2365958507', err);
    }
  }
}

export default VideoController;
