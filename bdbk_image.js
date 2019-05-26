// ==UserScript==
// @icon           http://baidu.com/favicon.ico
// @name           百度百科 无水印图片查看
// @namespace      http://weibo.com/liangxiafengge
// @version        1.3.1.2
// @description    查看百科最新版本、历史版本无水印图片，历史图册页面进入的图片暂时不支持。
// @match          http*://baike.baidu.com/picture/*
// @match          http*://baike.baidu.com/historypic/*
// @match          http*://baike.baidu.com/pic/*
// @match          http*://baike.baidu.com/picview/history/*
// @require        https://code.jquery.com/jquery-3.2.1.min.js
// @run-at         document-end
// ==/UserScript==
$(document).ready(function(){
    var imgPicture=document.getElementById('imgPicture');
    changeImg();
    var config = {
        attributes: true,
        childList: false,
        subtree: false
    };
    var observer = new MutationObserver(changeImg);
    observer.observe(imgPicture, config);
    //替换有水印的图片，替换“原图”中的链接
    function changeImg()
    {
        if ((imgPicture.src.indexOf('sign=')!=-1 ))//|| ( isFirst === 1 )
        {
            var imgId=window.location.href.split('pic=')[1];
            imgPicture.src='https://imgsrc.baidu.com/baike/pic/item/' + imgId + '.jpg';
            $('a.tool-button.origin').attr('href','https://imgsrc.baidu.com/baike/pic/item/' + imgId + '.jpg')
        }
    }
});
