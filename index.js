const config = require('./config');
const inquirer = require('inquirer');
const axios = require('axios');
const fs = require('fs');
const ProgressBar = require('progress');

(async function(){

  let token, quality, folder, count;
  let download_query = [];
  // Get user data
  if (config.token === '') {
    token = (await new Promise(resolve => {
      inquirer.prompt([{ type: 'input', name: 'token', message: 'SberZvuk token:'}]).then(resolve);
    })).token;
  } else token = config.token;

  if (config.quality === '' || (config.quality !== 'mid' && config.quality !== 'high' && config.quality !== 'flac')) {
    quality = (await new Promise(resolve => {
      inquirer.prompt([{ type: 'list', name: 'quality', message: 'Select track quality:', default: 1, choices: [
        { value: 'mid (mp3 128kbps)' },
        { value: 'high (mp3 320kbps)' },
        { value: 'flac (flac 1411kbps)' }
      ]}]).then(resolve);
    })).quality.split(' ')[0]; // kostili!!!
  } else quality = config.quality;

  if (config.folder === '') {
    const folderInput = (await new Promise(resolve => {
      inquirer.prompt([{ type: 'input', name: 'folder', message: 'Enter download path or leave it empty:' }]).then(resolve);
    })).folder;
    if (folderInput === '') folder = './Downloads';
    else folder = folderInput;
  } else folder = config.folder;
  search();
  //

  // Search tracks by url
  async function search() {
    const link = (await new Promise(resolve => {
      inquirer.prompt([{ type: 'input', name: 'link', message: 'Enter link to track/album/playlist:' }]).then(resolve);
    })).link;
    console.log('\n')
    const parsedLink = parseLink(link);
    if (!parsedLink[1] || !parsedLink[2]) {
      console.log('Bad url.');
      return search();
    }
    const response = await axios(`https://sber-zvuk.com/sapi/meta?${parsedLink[1]}=${parsedLink[2]}&include=(track%20(release%20label)%20artist)`, { method: 'get', headers: {'x-auth-token': token} });
    if (parsedLink[1] === 'releases' && response.data.result.releases[parsedLink[2]]) {
      const tracks = (await axios(`https://sber-zvuk.com/sapi/meta?tracks=${response.data.result.releases[parsedLink[2]].track_ids.join(',')}&include=(track%20(release%20label)%20artist)`, { method: 'get', headers: {'x-auth-token': token} })).data.result.tracks;
      for (const [key, value] of Object.entries(tracks)) {
        download_query.push(value);
        count = download_query.length;
      }
    }
    else if (parsedLink[1] === 'playlists' && response.data.result.playlists[parsedLink[2]]) {
      const tracks = (await axios(`https://sber-zvuk.com/sapi/meta?tracks=${response.data.result.playlists[parsedLink[2]].track_ids.join(',')}&include=(track%20(release%20label)%20artist)`, { method: 'get', headers: {'x-auth-token': token} })).data.result.tracks;
      for (const [key, value] of Object.entries(tracks)) {
        download_query.push(value);
        count = download_query.length;
      }
    }
    else if (response.data.result.tracks[parsedLink[2]]) download_query.push(response.data.result.tracks[parsedLink[2]]);
    else {
      console.log('Track not found.');
      return search();
    }
    if (parsedLink[1] !== 'tracks') {
      for (let i = 0; i < config.threads; i++)
      download(parsedLink[1], parsedLink[1] === 'playlists' ? response.data.result.playlists[parsedLink[2]].title : response.data.result.releases[parsedLink[2]].artist_names[0])
    }
    else download(parsedLink[1]);
  }
  //

  // Download track
  async function download(type, title) { // type отвечает за тип ссылки, title - для альбомов это первый артист, для плейличтов название
    const track = download_query.shift();

    // Check dir
    let download_path;
    if (type === 'tracks') { // Для треков и плейлистов каждый раз нужно качать обложку, ибо она может различаться
      
      if (!await fs.promises.stat(`${folder}/${track.artist_names[0]}`))
        await fs.promises.mkdir(`${folder}/${track.artist_names[0]}`);
      download_path = `${folder}/${track.artist_names[0]}`;
    }
    if (type === 'releases') {// При первом создании альбомных папок можно наверн сразу качать обложку
      if (!await fs.promises.stat(`${folder}/${title}}`))
        await fs.promises.mkdir(`${folder}/${title}}`);
      if (!await fs.promises.stat(`${folder}/${title}/${track.release_title}`))
        await fs.promises.mkdir(`${folder}/${title}/${track.release_title}`);
      download_path = `${folder}/${title}/${track.release_title}`;
    }

    if (type === 'playlists') {
      if (!await fs.promises.stat(`${folder}/${title}`))
        await fs.promises.mkdir(`${folder}/${title}`);
      download_path = `${folder}/${title}`;
    }
    //

    // Get stream url
    const streamUrl = (await axios(`https://sber-zvuk.com/api/tiny/track/stream?id=${track.id}&quality=${track.highest_quality === 'flac' ? quality : track.highest_quality !== quality && track.highest_quality === 'mid' ? 'mid' : 'high'}`, { headers: { 'x-auth-token': token } }));
    if (!streamUrl) return;
    const { data, headers } = await axios(streamUrl.data.result.stream, {
      method: 'get',
      responseType: 'stream'
    });

    const totalLength = headers['content-length'];
    if (config.threads === 1) { // надо перепилить
      process.stdout.moveCursor(0, -1);
      process.stdout.clearLine(1);
    }
    const progressBar = new ProgressBar(`${type !== 'tracks' ? `[${count - download_query.length}/${count}]` : ''} ${track.artist_names[0]} - ${track.title} -> downloading [:bar] :percent :etas`, {
        width: 20,
        complete: '=',
        incomplete: ' ',
        renderThrottle: 0,
        total: parseInt(totalLength),
        callback: () => {
          if (download_query.length) {
            return download(type, title);
          }
        }
      });

    const writer = fs.createWriteStream(`${download_path}/${type === 'tracks' ? '' : track.position < 10 ? '0' + track.position + '. ' : track.position + '. '}${track.artist_names[0]} - ${track.title}.${streamUrl.data.result.stream.includes('streamfl') ? 'flac' : 'mp3'}`);
    data.on('data', (chunk) => progressBar.tick(chunk.length));
    data.pipe(writer);
  }

  // Parse link
  function parseLink(link) {

    if (link.includes('?')) link = link.slice(0, link.indexOf('?'));
    if (link.includes('&')) link = link.slice(0, link.indexOf('&'));
    if (link.endsWith('/')) link = link.slice(0, -1);
    let link_type, link_id;

    if (!link.includes('sber-zvuk.com')) return [link, link_type, link_id];
    if (link.search(/[/:]track[/:](.+)/g) != -1) {
      link_type = 'tracks';
      link_id = /[/:]track[/:](.+)/g.exec(link)[1];
    } else if (link.search(/[/:]release[/:](.+)/g) != -1) {
      link_type = 'releases';
      link_id = /[/:]release[/:](.+)/g.exec(link)[1];
    } else if (link.search(/[/:]playlist[/:](\d+)/g) != -1) {
      link_type = 'playlists';
      link_id = /[/:]playlist[/:](.+)/g.exec(link)[1];
    }

    return [link, link_type, link_id];
  }
})();
