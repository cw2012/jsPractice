// ==UserScript==
// @name         新传媒下载
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  下载新传媒的视频、字幕
// @author       You
// @match        http*://video.toggle.sg/*/series/*
// @match        http*://video.toggle.sg/*/movies/*
// @match        http*://video.toggle.sg/*/tv-show/*
// @match        http*://video.toggle.sg/*/extras/*
// @require      https://code.jquery.com/jquery-3.2.1.min.js
// @icon         https://video.toggle.sg/blob/5006328/2c6398f2bf4c0d3e9d43efc9bfb87bbc/toggle-video-favicon.ico
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';
    var mediaId='';
    mediaId=location.href.split('/').pop().match(/[0-9]+/)[0];
    var media = {
        mediaId : mediaId,
        mediaName:'',
        subtitles:[],
        // 获取字幕信息
        getSubtitle: function(Id){
            var lang = ['eng','zho','msa','tam'],targetLang=['英文','中文','马来语','泰米尔语'];
            GM_xmlhttpRequest({
                url:'https://sub.toggle.sg/toggle_api/v1.0/apiService/getSubtitleFilesForMedia?mediaId='+Id,
                method:'get',
                onload:(res)=>{
                    res=JSON.parse(res.responseText);
                    if(res.subtitleFiles.length){
                        $('#subSelect').empty();
                        for(var i=0;i<res.subtitleFiles.length;i++){
                            $('#subSelect').append($('<option></option>').attr('value',res.subtitleFiles[i].subtitleFileUrl).text(targetLang[lang.indexOf(res.subtitleFiles[i].subtitleFileCode)]));
                        }
                    }
                },
            });
        },
        // 获取视频信息
        getVideoInfo: function(Id){
            var Files={};
            if((typeof kalturaIframePackageData!=='undefined') && (typeof kalturaIframePackageData.playerConfig.plugins.proxyData.Files!=='undefined')){
                Files = kalturaIframePackageData.playerConfig.plugins.proxyData.Files;
                this.getInfo(Files);
            }else{
                GM_xmlhttpRequest({
                    //   https://tvpapi-as.ott.kaltura.com/v3_9/gateways/jsonpostgw.aspx?m=GetMediaInfo
                    url:'https://tvpapi-as.ott.kaltura.com/v3_9/gateways/jsonpostgw.aspx?m=GetMediaInfo',
                    method:'post',
                    dataType : 'json',
                    data:JSON.stringify({
                        initObj:
                        {
                            Platform:"Web", SiteGuid:"",DomainID:"0",UDID:"",ApiUser:"tvpapi_147",ApiPass:"11111",
                            Locale:{ LocaleLanguage:"",LocaleCountry:"",LocaleDevice:"",LocaleUserState:"Unknown" }
                        },
                        MediaID:''+Id
                    }),
                    onload:(data)=>{
                        if(data){
                            data=JSON.parse(data.responseText);
                            this.mediaName=data.MediaName;
                            Files = data.Files;
                            media.getVideos(Files);
                        }
                    },
                    onerror:function(data){
                        console.log('\n出错了'+data.responseText+'\n');
                    }
                });
            }
        },
        // 加载不同设备的视频初级地址
        getVideos(Files){
            var sel = $('<select id="videoSelect"></select>');
            var sel2= $('<select id="formatSelect"></select>').append($('<option value="">请选择</option>'));
            var spa = $('<span></span>').text('设备:');
            var spa2= $('<span ></span>').text('分辨率:');
            for(var i=0;i<Files.length;i++){
                if(Files[i].Format.indexOf('HLS')>-1){
                    sel.append( $('<option></option>)').attr('value',Files[i].URL).text(Files[i].Format.substr(4,7)) );
                }
            }
            var button = $('<a id="downloadVideo">下载视频</a>').css('cursor', 'pointer');
            button.on('click',()=>{
                GM_setClipboard($('#formatSelect').find('option:selected').val());
                GM_download($('#formatSelect').find('option:selected').val(),this.mediaName);
            });
            $('.video__meta .meta .item__tags').append(spa.append(sel)).append(spa2.append(sel2)).append(button).append('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;').append($('<span><select id="subSelect"></select><a id="subA">下载字幕</a></span>'));
            $('#subA').css('cursor', 'pointer').on('click',()=>{
                GM_download($('#subSelect').find('option:selected').val(),this.mediaName+$('#subSelect').find('option:selected').text()+'.srt');
            });
            sel.on('change',()=>{// 选择设备后加载不同分辨率的地址
                var video = $('#videoSelect').find("option:selected").val();
                GM_xmlhttpRequest({
                    url:video,
                    method:'get',
                    onload:(data)=>{
                        if(data){
                            // 在页面上加载选择框和按钮
                            data=data.responseText;
                            this.getm3u8(data,this.mediaName)
                        }
                    }
                });
            });
            media.getSubtitle(media.mediaId);
            sel.change();
        },
        getm3u8(content, mediaName){
            //debugger
            if(content.indexOf('#EXT-X-MEDIA:TYPE=AUDIO')>-1 && !$('#audioSel')[0]){
                var audioSel = $('<select id="audioSel"></select>'),videoSel=$('#formatSelect').empty();
                var arr = content.match(/#EXT-X-MEDIA:TYPE=AUDIO[\S]+/g);
                var langs = ['English','Korean','Chinese'],trans=['英语','韩语','汉语'],matches='';
                for(var i=0;i<arr.length;i++){
                    // 加载音轨选择框                                           网址                                                  显示音轨的国别
                    audioSel.append($('<option></option>').attr('value',arr[i].match(/https*[\S]+m3u8/)[0]).text(trans[langs.indexOf(arr[i].match(/[\w]+/g)[11])]));
                }
                //去掉音轨部分，只保留视频
                content=content.replace(/\n/g,'').substring(content.indexOf('#EXT-X-STREAM-INF:PROGRAM-ID'),content.length);
                arr=content.match(/https*.*?m3u8/g);
                var p  =content.match(/[\d]{2,3}x[\d]{3,4}/g);
                for(i=0;i<arr.length;i++){
                    videoSel.append($('<option></option>').attr('value',arr[i]).text(p[i].split('x')[1]+'P'));//填充视频选择框
                }
                $('.video__meta .meta .item__tags').append('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;').append(audioSel).append('<a id="subAudio">下载音轨</a>');// 在页面上加载选择框和按钮
                $('#subAudio').css('cursor', 'pointer').on('click',()=>{
                    GM_download($('#audioSel').find('option:selected').val(),mediaName+$('#audioSel').find('option:selected').text());
                });
            } else {
                if(content.indexOf('#EXT-X-MEDIA:TYPE=AUDIO')>-1){
                    content=content.replace(/\n/g,'').substring(content.indexOf('#EXT-X-STREAM-INF:PROGRAM-ID'),content.length);
                }
                var urls = content.match(/https*.*?.m3u8/g);
                var p = content.match(/[\d]{2,3}x[\d]{3,4}/g);
                var el = $('#formatSelect').empty();
                for(var j=0;j<p.length;j++){
                    el.append($('<option></option>').attr('value',urls[j]).text(p[j].split('x')[1]+'P'));
                }
            }
        }
    };
    media.getVideoInfo(media.mediaId);
})();
