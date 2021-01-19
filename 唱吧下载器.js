// ==UserScript==
// @name         唱吧下载器
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  在听歌页面，提供该用户的所有歌曲下载
// @author       cw2012
// @match        http*://changba.com/s/*
// @icon         http://changba.com/favicon.ico
// @connect      *
// @require      https://cdn.bootcdn.net/ajax/libs/jszip/3.5.0/jszip.min.js
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @run-at       document-end
// ==/UserScript==

// 2021-01 歌手个人主页已不可用： http*://changba.com/u/*
(function() {
    'use strict';

    //首先禁止自动播放，烦死了
    let audioEle = document.getElementById('audio');
    if(audioEle){
        audioEle.autoplay = false;
    }
    insertCss();
    let userId, userName=document.querySelector('.ulevel').innerText;
    let pageIndex = 0, curSongIndex = 0;
    let songList = [], songCount, zip, mvCount = 0;
    $('span.info').css('width','60px');
    let sibling = document.querySelector('span.fav');
    sibling.parentNode.innerHTML = '<span class="export info" style="width:60px" data-status="0" id="btn_download"><em>下载</em></span>'+ sibling.parentNode.innerHTML;
    document.getElementById('btn_download').addEventListener('click',()=>{
        GM_download({
            url: document.getElementById('audio').src,
            name: `${$('.title').html()}.mp3`
        });
    });
    addListBox();
    analysisSongList();

    function addListBox(){
        let listBox= document.createElement('div');
        listBox.id = 'songListBox';
        listBox.style.position = 'fixed'
        listBox.style.height='400px'
        listBox.style.width='400px'
        listBox.style.borderRadius='0px 10px 10px 0px';
        listBox.style.boxShadow = '#fba9a9 3px 4px 40px 1px';
        listBox.style.top='100px';
        let titleDiv = document.createElement('div');
        titleDiv.className ='widget-header-simple';
        titleDiv.style.color = '#fff';
        titleDiv.style.textAlign = 'center';
        titleDiv.style.display = 'flex';
        titleDiv.style.alignItems = 'center';
        titleDiv.style.justifyContent  = 'center';
        titleDiv.style.borderRadius = '0px 10px 0px 0px';
        titleDiv.innerHTML = '<p id="songListTitle" style="font-size:16px">正在解析用户作品列表</p>';
        listBox.append(titleDiv);
        document.body.append(listBox);
    }
    function analysisSongList(){
        userId = document.querySelector('.focus').getAttribute('data-userid');
        updateSongList();
    }
    function updateSongList(){
        GM_xmlhttpRequest({
            url: `http://changba.com/member/personcenter/loadmore.php?ver=1&pageNum=${pageIndex++}&type=0&userid=${userId}`,
            method: 'get',
            timeout: 5000,
            responseType : 'json',
            onload: res=>{
                const data = res.response;
                if(data.length>0){
                    for(var i = 0; i< data.length;i++){
                        if(data[i].ismv ==`style='display:inline'`){
                            songList.push(newSong(data[i].workid, data[i].songname, data[i].enworkid, true));
                            mvCount++;
                        }else{
                            songList.push(newSong(data[i].workid, data[i].songname, data[i].enworkid, false));
                        }
                    }
                    updateSongList();
                }else{
                    showSongList();
                }
            },
            onerror: err=>{
                alert(`获取歌曲列表失败`);
            }
        });
    }
    function showSongList(){
        document.getElementById('songListTitle').innerText = `该用户有${songList.length}首歌` + (mvCount?('(其中包含'+mvCount+'个MV)'):'');
        let songListDiv = document.createElement('div');
        songListDiv.className = 'songList';
        let ol = document.createElement('ol');
        songList.forEach((item,index)=>{
            let li = document.createElement('li');
            li.className = 'song';
            let a = document.createElement('a');
            a.innerText = '下载';
            a.href = '#';
            let span = document.createElement('span');
            span.innerText = item.name;
            if(item.hasMV){
                let img = document.createElement('img');
                img.className = 'mv';
                img.src='https://www.zhangxinxu.com/study/image/pixel.gif';
                span.append(img);
                a.style.color = 'gray';
                a.style.cursor='not-allowed';
            }else{
                a.addEventListener('click',()=>{
                    downloadSingleSong(item,a);
                });
            }
            li.append(span);
            li.append(a);
            a = document.createElement('a');
            a.innerText = '查看';
            a.href = 'http://changba.com/s/' + item.enworkid;
            li.append(a);
            ol.append(li);
        });
        songListDiv.append(ol);
        document.getElementById('songListBox').append(songListDiv);
    }
    function downloadSingleSong(song,a){
        let id= song.id, name=song.name,enworkid=song.enworkid;
        let fileName = userName+'-'+name + '.mp3';
        let progress = document.createElement('progress');
        progress.value= 0;
        progress.max = 100;
        GM_xmlhttpRequest({
            url: `http://changba.com/s/${enworkid}`,
            method: 'get',
            timeout: 5000,
            onload: res =>{
                let html = res.responseText;
                let index = html.indexOf('commonObj.url');
                if(index!=-1){
                    html = html.substr(index, 200);
                    html = html.match(/'[\w/=+]+'/g)[0];
                    html = html.substr(1, html.length -2);
                    var _0x381e52 = 'a17fe74e421c2cbf3dc323f4b4f3a1af' , iv = CryptoJS.enc.Utf8.parse(_0x381e52.substring(0,16))
                    , iv2 = CryptoJS.enc.Utf8.parse(_0x381e52.substring(16))
                    , audio_url = '';
                    audio_url = CryptoJS.AES.decrypt(html, iv2, {
                        'iv': iv,
                        'padding': CryptoJS.pad.Pkcs7
                    })['toString'](CryptoJS.enc.Utf8);
                    a.parentElement.insertBefore(progress, a);
                    GM_download({
                        url: audio_url,
                        name: fileName,
                        onprogress: prog=>{progress.value = prog.loaded;progress.max = prog.total;},
                        onload: res=>{ progress.remove();},
                        ontimeout: res=>{alert('下载超时，请重试'); progress.remove();},
                        onerror:res=>{alert('下载出错，请重试'); progress.remove();}
                    });
                }
            }
        });
    }
    function downloadSongList(){
        zip = new JSZip();
        curSongIndex = 0;
        if(songCount > 1){
            songList.forEach((item, index)=>{
                if(item.hasMV){
                    console.log(item.name+ ' - 无法下载MV')
                }
                let fileName = userName+'-'+item.name + '.mp3';
                GM_xmlhttpRequest({
                    url: `http://changba.com/s/${item.enworkid}`,
                    method: 'get',
                    timeout: 5000,
                    onload: res =>{
                        let html = res.responseText;
                        let index = html.indexOf('commonObj.url');
                        // 解析地址
                        if(index!=-1){
                            html = html.substr(index, 200);
                            html = html.match(/'[\w/=+]+'/g)[0];
                            html = html.substr(1, html.length -2);
                            var _0x381e52 = 'a17fe74e421c2cbf3dc323f4b4f3a1af' , iv = CryptoJS.enc.Utf8.parse(_0x381e52.substring(0,16))
                            , iv2 = CryptoJS.enc.Utf8.parse(_0x381e52.substring(16))
                            , audio_url = '';
                            audio_url = CryptoJS.AES.decrypt(html, iv2, {
                                'iv': iv,
                                'padding': CryptoJS.pad.Pkcs7
                            })['toString'](CryptoJS.enc.Utf8);
                            // 下载歌曲
                            GM_xmlhttpRequest({
                                url: audio_url,
                                method: 'get',
                                responseType :'blob',
                                timeout: 5000,
                                onload: res =>{
                                    const mp3Data = new File([res.response], fileName);
                                    zip.file(`${song.name}.mp3`, mp3Data, { base64: true });
                                    zip.generateAsync({type: 'blob'}).then(
                                        contentWithTxt=> {
                                            if(++curSongIndex == songCount){
                                                downloadFileByBlob(contentWithTxt, userName);
                                            }else{
                                                progress();
                                                console.log(`歌曲《${song.name}》下载成功`);
                                                song = songList[curSongIndex];
                                                loopDownload(song);
                                            }
                                        }
                                    );
                                }
                            });
                        }
                    }
                });
            });
        }
    }
    function loopDownload(song){
        if(song.hasMV){
            return;
        }else{
        }
        GM_xmlhttpRequest({
            url: `http://upscuw.changba.com/${song.id}.mp3`,  // http://aliuwmp3.changba.com/userdata/userwork/${song.id}.mp3
            method: 'get',
            timeout: 5000,
            responseType : 'blob',
            onload: res =>{
                if(res.response.size>1024){
                    const mp3Data = new File([res.response], song.name);
                    zip.file(`${song.name}.mp3`, mp3Data, { base64: true });
                    zip.generateAsync({type: 'blob'}).then(
                        contentWithTxt=> {
                            if(++curSongIndex == songCount){
                                downloadFileByBlob(contentWithTxt, userName);
                            }else{
                                progress();
                                console.log(`歌曲《${song.name}》下载成功`);
                                song = songList[curSongIndex];
                                loopDownload(song);
                            }
                        }
                    );
                }else{
                    retryDownload(song);
                }
            }
        });
    }
    // 显示下载进度
    function progress(){
        let bar = document.getElementById('progressBar');
        if(bar){
            document.getElementById('prog-num').innerText = `正在下载：${curSongIndex + 1}/${songCount}`;
            document.getElementById('song-name').innerText = songList[curSongIndex].name;
            if(curSongIndex + 1 == songCount){
                bar.remove();
            }
            return;
        }
        let progressBox = document.createElement('div');
        progressBox.id = 'progressBar';
        progressBox.style.position = 'fixed';
        progressBox.style.background='white';
        progressBox.style.borderRadius='10px';
        progressBox.style.background= `rgb(255 80 70)`;
        progressBox.style.border = 'solid white 1px';
        progressBox.style.boxShadow='0 8px 16px 0 rgba(0,0,0,.2), 0 6px 20px 0 rgba(0,0,0,.19)';
        progressBox.style.color = '#fff';
        progressBox.style.bottom='200px';     // 显示的位置不能离底部太低了，会被其他元素遮挡
        progressBox.style.left='2vh';
        progressBox.style.transition='1.5s';
        progressBox.style.padding = '10px';
        let progNum = document.createElement('p');
        progNum.id = 'prog-num';
        progNum.innerText = `1/${songCount}`;
        let downName = document.createElement('p');
        downName.id = 'song-name';
        downName.innerText='正在下载...';
        progressBox.append(progNum);
        progressBox.append(downName);
        document.body.appendChild(progressBox);
    }
})();

function newSong(id, name,enworkid, hasMV){
    let song = new Object();
    song.id = id;
    song.name = name;
    // song.singleDownload = singleDownload;
    song.enworkid = enworkid;
    // song.download = download;
    song.hasMV = hasMV;
    return song;
}

// 利用blob下载文件
function downloadFileByBlob(blobContent, filename) {
    const blobUrl = URL.createObjectURL(blobContent)
    const eleLink = document.createElement('a')
    eleLink.download = filename
    eleLink.style.display = 'none'
    eleLink.href = blobUrl
    eleLink.click();
}

function insertCss(){
    var style=document.createElement('style');
    const myStyle = `
ol{
padding:10px;
}
li.song{
margin:10px 0;
font-size:14px;
color:black;
    padding: 5px;
    background: #ffeded;
display: flex;
    align-items: center;
    justify-content: space-evenly;
    flex-direction: row;
}
li.song span{
width: 210px;
}
div.songList{
overflow: scroll;
    overflow-y: auto;
    overflow-x: hidden;
    height: 330px;
}
.mv{
background: url(https://greasyfork.s3.us-east-2.amazonaws.com/xv0qosox3hocgp4jni3qydurnlom) no-repeat;
background-size: 100% 100%;
    width: 25px;
    height: 25px;
margin-left: 4px;
}
li a {
    color: #ff142e;
}
/*进度条的样式*/
progress{
width:40px;
height:15px;
}

progress::-webkit-progress-value
{
     background-color:#ff0040;
}
`;
    style.type='text/css';
    if(style.styleSheet){
        style.styleSheet.cssText=myStyle;
    }else{
        style.appendChild(document.createTextNode(myStyle));
    }
    document.getElementsByTagName('head')[0].appendChild(style);
}
