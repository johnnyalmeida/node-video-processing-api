import fs from 'fs';
import AWS from 'aws-sdk';
import ffmpeg from 'fluent-ffmpeg';
import request from 'request';
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
      const fileName = `${data.key}`;
      const key = `videos/${fileName}.mp4`;
      let file;
      try {
        file = fs.createWriteStream(`${this.config.relative_temp_path}tmp/videos/${fileName}.mp4`);
      } catch (e) {
        this.postBack(fileName, 'error');
      }
      const params = {
        Bucket: this.config.aws.bucket,
        Key: key,
      };

      this.s3.getObject(params).createReadStream()
        .on('error', (err) => {
          this.postBack(fileName, 'error');
          Logger.throw(res, '2365958507', err);
        })
        .pipe(file)
        .on('finish', () => {
          const filePath = `${this.config.relative_temp_path}tmp/videos/${fileName}.mp4`;
          const newPath = `${this.config.relative_temp_path}tmp/videos/processed/${fileName}.mp4`;
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
                this.postBack(fileName, 'error');
                Logger.throw(res, '2365958507', err);
              })
              .on('end', () => {
                this.generateThumb(newPath, fileName);
              });
          } catch (e) {
            this.postBack(fileName, 'error');
            Logger.throw(res, '2365958507', e);
          }
        });
    } catch (err) {
      Logger.throw(res, '2365958507', err);
    }
  }

  generateThumb(filePath, fileName, res) {
    const thumbPath = `${this.config.relative_temp_path}tmp/videos/thumbs/${fileName}.jpg`;
    const thumbName = `${fileName}.jpg`;
    try {
      console.log('thumb');
      ffmpeg(filePath)
        .on('end', () => {
          this.moveVideoThumb(thumbPath, thumbName, res);
          this.generateCover(filePath, fileName, res);
        })
        .screenshots({
          count: 1,
          timestamps: [0.1],
          folder: `${this.config.relative_temp_path}tmp/videos/thumbs`,
          filename: thumbName,
          size: '113x200',
        })
        .on('error', (err) => {
          this.postBack(fileName, 'error');
          Logger.throw(res, '2365958507', err);
        });
    } catch (e) {
      this.postBack(fileName, 'error');
      Logger.throw(res, '2365958507', e);
    }
  }

  generateCover(filePath, fileName, res) {
    const coverPath = `${this.config.relative_temp_path}tmp/videos/covers/${fileName}.jpg`;
    const coverName = `${fileName}.jpg`;
    try {
      ffmpeg(filePath)
        .on('end', () => {
          this.moveVideoCover(coverPath, coverName, res);
          this.moveProcessedFile(filePath, fileName, res);
        })
        .screenshots({
          count: 1,
          timestamps: [0.1],
          folder: `${this.config.relative_temp_path}tmp/videos/covers`,
          filename: coverName,
          size: '750x1334',
        })
        .on('error', (err) => {
          this.postBack(fileName, 'error');
          Logger.throw(res, '2365958507', err);
        });
    } catch (e) {
      this.postBack(fileName, 'error');
      Logger.throw(res, '2365958507', e);
    }
  }

  moveVideoThumb(filePath, fileName, res) {
    try {
      fs.readFile(filePath, async (err, data) => {
        if (err) { throw err; }
        const base64data = Buffer.from(data, 'binary');
        const { bucket } = this.config.aws;
        const key = `videos/thumbs/${fileName}`;

        this.s3.putObject({
          Bucket: bucket,
          Key: key,
          Body: base64data,
        }, (e, result) => {
          if (e) {
            this.postBack(fileName.replace('.jpg', ''), 'error');
            Logger.throw(res, '2365958507', err);
          }
          const file = {
            path: key,
            s3: result,
          };
          return file;
        });
      });
    } catch (err) {
      Logger.throw(res, '2365958507', err);
    }
  }

  moveVideoCover(filePath, fileName, res) {
    try {
      fs.readFile(filePath, async (err, data) => {
        if (err) { throw err; }
        const base64data = Buffer.from(data, 'binary');
        const { bucket } = this.config.aws;
        const key = `videos/covers/${fileName}`;

        this.s3.putObject({
          Bucket: bucket,
          Key: key,
          Body: base64data,
        }, (e, result) => {
          if (e) {
            this.postBack(fileName.replace('.jpg', ''), 'error');
            Logger.throw(res, '2365958507', err);
          }
          const file = {
            path: key,
            s3: result,
          };
          return file;
        });
      });
    } catch (err) {
      Logger.throw(res, '2365958507', err);
    }
  }

  moveProcessedFile(filePath, fileName, res) {
    try {
      fs.readFile(filePath, async (err, data) => {
        if (err) { throw err; }
        const base64data = Buffer.from(data, 'binary');
        const { bucket } = this.config.aws;
        const key = `videos/processed/${fileName}.mp4`;

        this.s3.putObject({
          Bucket: bucket,
          Key: key,
          Body: base64data,
        }, (e, result) => {
          if (e) {
            Logger.throw(res, '2365958507', err);
            this.postBack(fileName, 'error');
          }
          const file = {
            path: key,
            s3: result,
          };
          this.postBack(fileName, 'success');
          return file;
        });
      });
    } catch (err) {
      this.postBack(fileName, 'error');
      Logger.throw(res, '2365958507', err);
    }
  }

  processWithGif(key) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(`${this.config.relative_temp_path}tmp/videos/${key}`);

      const params = {
        Bucket: this.config.aws_bucket,
        Key: `videos/${key}`,
      };

      this.s3.getObject(params).createReadStream().pipe(file)
        .on('finish', () => {
          const filePath = `${this.config.relative_temp_path}tmp/videos/${key}`;
          const newPath = `${this.config.relative_temp_path}tmp/videos/processed/${key}`;

          ffmpeg(filePath)
            .input('./_files/homer.gif')
            .audioCodec('aac')
            .videoCodec('libx264')
            .videoBitrate(1000)
            .inputOptions('-ignore_loop 0')
            .complexFilter([
              '[0:v]crop=in_w-2*28:in_h-2*25[base];[base][1:v]overlay=400:H-h-500:shortest=1',
            ])
            .save(newPath)
            .on('end', () => {
              this.moveTempToS3(newPath, key, resolve, reject)
                .then((data) => {
                  resolve(data);
                })
                .catch(error => reject(error));
            });
        });
    });
  }

  postBack(key, status) {
    request.put(
      `${this.config.media_share_api}/history/`,
      {
        json: { key, status },
      },
      (errRequest, response) => {
        if (!errRequest && response.statusCode === 200) {
          return true;
        }
        Logger.throw(null, '2365958507', errRequest);
        return false;
      },
    );
  }
}

export default VideoController;
