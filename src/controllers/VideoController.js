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
      console.log(data);
      console.log('process');
      const fileName = `${data.key}`;
      const key = `videos/${fileName}.mp4`;
      let file;
      try {
        file = fs.createWriteStream(`${this.config.relative_temp_path}tmp/videos/${fileName}.mp4`);
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
              .screenshots({
                count: 1,
                folder: `${this.config.relative_temp_path}tmp/videos/covers`,
                filename: `${fileName}.jpg`,
                size: '750x1334',
              })
              .on('error', (err) => {
                this.postBack(fileName, 'error');
                console.log(err);
              })
              .on('end', () => {
                this.generateThumb(newPath, fileName);
                console.log('moving');
              });
          } catch (e) {
            this.postBack(fileName, 'error');
            console.log(e);
          }
        });
    } catch (err) {
      console.log(err);
      Logger.throw(res, '2365958507', err);
    }
  }

  generateThumb(filePath, fileName, res) {
    const coverPath = `${this.config.relative_temp_path}tmp/videos/covers/${fileName}.jpg`;
    const thumbPath = `${this.config.relative_temp_path}tmp/videos/thumbs/${fileName}.jpg`;
    const thumbName = `${fileName}.jpg`;
    try {
      ffmpeg(filePath)
        .on('filenames', (filenames) => {
          console.log(`Will generate ${filenames.join(', ')}`);
        })
        .on('end', () => {
          console.log('Screenshots taken');
          this.moveVideoThumb(thumbPath, thumbName, res);
          this.moveVideoCover(coverPath, fileName, res);
        })
        .screenshots({
          count: 1,
          folder: `${this.config.relative_temp_path}tmp/videos/thumbs`,
          filename: thumbName,
          size: '113x200',
        })
        .on('error', (err) => {
          this.postBack(fileName, 'error');
          console.log(err);
        });
    } catch (e) {
      console.log(e);
    }
  }

  generateCover(filePath, fileName, res) {
    const coverPath = `${this.config.relative_temp_path}tmp/videos/covers/${fileName}.jpg`;
    const coverName = `${fileName}.jpg`;
    try {
      ffmpeg(filePath)
        .on('filenames', (filenames) => {
          console.log(`Will generate ${filenames.join(', ')}`);
        })
        .on('end', () => {
          console.log('Cover screenshots taken');
          this.moveVideoCover(coverPath, coverName, res);
          this.moveProcessedFile(filePath, fileName, res);
        })
        .screenshots({
          count: 1,
          folder: `${this.config.relative_temp_path}tmp/videos/covers`,
          filename: coverName,
          size: '750x1334',
        })
        .on('error', (err) => {
          this.postBack(fileName, 'error');
          console.log(err);
        });
    } catch (e) {
      console.log(e);
    }
  }

  moveVideoThumb(filePath, fileName, res) {
    try {
      console.log('uploading thumbs');
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
          console.log('move');
          if (e) {
            this.postBack(fileName.replace('.jpg', ''), 'error');
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

  moveVideoCover(filePath, fileName, res) {
    try {
      console.log('uploading cover');
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
          console.log('move');
          if (e) {
            this.postBack(fileName.replace('.jpg', ''), 'error');
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

  moveProcessedFile(filePath, fileName, res) {
    try {
      console.log('reading');
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
          console.log('move');
          if (e) {
            Logger.throw(res, '2365958507', err);
            this.postBack(fileName, 'error');
          }
          const file = {
            path: key,
            s3: result,
          };
          console.log(file);
          this.postBack(fileName, 'success');
          return file;
        });
      });
    } catch (err) {
      console.log(err);
      this.postBack(fileName, 'error');
      // Logger.throw(res, '2365958507', err);
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
          console.log('start processing');
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
              console.log('processed');
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
    console.log('posting back to media api');
    request.put(
      `${this.config.media_share_api}/history/`,
      {
        json: { key, status },
      },
      (errRequest, response) => {
        if (!errRequest && response.statusCode === 200) {
          console.log(`posted back: ${key}`);
        } else {
          console.log(errRequest);
          console.log(`error when posting back: ${key}`);
        }
      },
    );
  }
}

export default VideoController;
