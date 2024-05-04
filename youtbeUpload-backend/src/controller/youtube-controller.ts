import fs from "fs"
import path from "path"
import readline from "readline"
import {google} from "googleapis"
import { authorize } from "./youtube-auth"
import { videoFilePath, thumbFilePath } from "../store"

// This file contain all the youtube functional code

// Video category IDs for YouTube:
const categoryIds = {
    Entertainment: 24,
    Education: 27,
    ScienceTechnology: 28
  }

 const SCOPES = ['https://www.googleapis.com/auth/youtube.upload']



 export const readAuthFile = (path:any, callback?:any) => {
  console.log(path)
    const data = fs.readFileSync(path, {
      encoding : "utf8"
    });
    console.log("Data is ",data);

    callback(JSON.parse(data))
 }

export const uploadTheVideo = (title:string, description:string, tags:string[] | string, videoFilePath : string, thumbFilePath : string) => {
    console.log("Dir is ",__dirname)

    readAuthFile(path.resolve(__dirname, '../../secret/client_secret.json'), (data: any) => {
      authorize(data, (auth:any) => uploadVideo(auth, title, description, tags, videoFilePath, thumbFilePath))
    })
    // Load client secrets from a local file.
    // fs.readFile(path.resolve(__dirname, '../../secret/client_secret.json'), function processClientSecrets(err, content:Buffer) {
    //   if (err) {
    //     console.log('Error loading client secret file: ' + err);
    //     return;
    //   };
    //   console.log("I am In fs readfile")
    //   // Authorize a client with the loaded credentials, then call the YouTube API
    //   authorize(JSON.parse(content.toString()), (auth:any) => uploadVideo(auth, title, description, tags, videoFilePath, thumbFilePath));
    // });
  }


  export function getNewToken(oauth2Client:any, callback:any, token? : any) {
    console.log(process.env.SCOPES)
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);  
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function(code : string) {
      rl.close();
      oauth2Client.getToken(code, function(err:any, token:any) {
        if (err) {
          console.log('Error while trying to retrieve access token', err);
          return;
        }
        oauth2Client.credentials = token;
        storeToken(token);
        callback(oauth2Client);
      });
    });
  }
  
  
  
  export function storeToken(token:any) {
    fs.writeFile(process.env.TOKEN_PATH || "", JSON.stringify(token), (err) => {
      if (err) throw err;
      console.log("Token Is Stored")
      console.log('Token stored to ' + process.env.TOKEN_PATH || "");
    });
  };


  export function uploadVideo(auth:any, title:any, description:any, tags:any, videoFilePath: string, thumbFilePath : string) {
    const service = google.youtube('v3')
    console.log("I am in upload video")
    //@ts-ignore
    const res = service.videos.insert({
      auth: auth,
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title,
          description,
          tags,
          categoryId: categoryIds.ScienceTechnology,
          defaultLanguage: 'en',
          defaultAudioLanguage: 'en'
        },
        status: {
          privacyStatus: "private"
        },
      },
      media: {
        body: fs.createReadStream(videoFilePath),
      },
    }, function(err:any, response:any) {
      if (err) {
        console.log('The API returned an error: ' + err);
        return;
      }
      console.log(response.data)
  
      console.log('Video uploaded. Uploading the thumbnail now.')
      service.thumbnails.set({
        auth: auth,
        videoId: response.data.id,
        media: {
          body: fs.createReadStream(thumbFilePath)
        },
      }, function(err:any, response:any) {
        if (err) {
          console.log('The API returned an error: ' + err);
          return err;
        }
        console.log(response.data)
      })
    });

    return res;
  }