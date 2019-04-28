// ==UserScript==
// @name         新传媒下载
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  下载新传媒的视频、字幕
// @author       You
// @match        http*://video.toggle.sg/*/series/*
// @match        http*://video.toggle.sg/*/movies/*
// @match        http*://video.toggle.sg/*/tv-show/*
// @require      https://code.jquery.com/jquery-3.2.1.min.js
// @icon         https://video.toggle.sg/blob/5006328/2c6398f2bf4c0d3e9d43efc9bfb87bbc/toggle-video-favicon.ico
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';
    var media = {
        mediaId : location.href.split(/ep[0-9]+\//)[1].split('/')[0],
        mediaName:'',
        subtitles:[],
        // 获取字幕信息
        getSubtitle: function(Id){
            var lang = ['eng','zho','msa'],targetLang=['英文','中文','马来西亚'];
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
            sel.on('change',()=>{// 选择设备后加载不同分辨率的地址
                var video = $('#videoSelect').find("option:selected").val();
                GM_xmlhttpRequest({
                    url:video,
                    method:'get',
                    onload:(data)=>{
                        if(data){
                            data=data.responseText;
                            this.getm3u8(data);
                        }
                    }
                });
            });
            var button = $('<a id="downloadVideo">下载视频</a>').css('cursor', 'pointer');
            button.on('click',()=>{
                GM_setClipboard($('#formatSelect').find('option:selected').val());
                GM_download($('#formatSelect').find('option:selected').val(),this.mediaName);
            });
            $('.video__meta .meta .item__tags').append(spa.append(sel)).append(spa2.append(sel2)).append(button).append('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;').append($('<span><select id="subSelect"></select><a id="subA">下载字幕</a></span>'));
            $('#subA').css('cursor', 'pointer').on('click',()=>{
                GM_download($('#subSelect').find('option:selected').val(),this.mediaName+$('#subSelect').find('option:selected').text()+'.srt');
            });
            sel.change();
        },
        getm3u8(content){
            var urls = content.match(/http\S+\.m3u8/g);
            var p = content.match(/[0-9]+x[0-9]+/g);
            var el = $('#formatSelect').empty();
            for(var i=0;i<p.length;i++){
                el.append($('<option></option>').attr('value',urls[i]).text(p[i].split('x')[1]+'P'));
            }
        }
    };
    media.getVideoInfo(media.mediaId);
    media.getSubtitle(media.mediaId);
})();
