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
background: url(data:image/png;base64,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) no-repeat;
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
