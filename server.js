#!/usr/bin/env node

/*
 * Created By: Paris Do
 */
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');

url = 'http://disco.neuinfo.org/webportal/dataPipelineResourceDashboard.do';

request(url, function(error, response, html){
    if(!error){
        var $ = cheerio.load(html);

    var no, id_num, resource_name, service, views, records, version, ver_date, status1, checked, type, crawl, status2, date;

    // empty json arrays
    var output = [];
    var recrawl = [];
    var src_config = [];
    var check_src = [];
    var src_imported = [];


    /* Check if character is a number */
    function isNumber(n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
    }

    /* Calculate difference between the current date and the checked date */
    function diff_between_todays_date (d1) {
      var date1 = d1.split("-");
      var date2 = new Date();
      var new_date1 = new Date(date1[0], date1[1] - 1, date1[2]);
      var diff = date2.getTime() - new_date1.getTime();
      return Math.ceil(diff/(1000*60*60*24));
    }

    /* Calculate difference between checked date and date */
    function diff_btwn_two_dates (d1, d2) {
      var date1 = d1.split("-");
      var date2 = d2.split("-");
      var new_date1 = new Date(date1[0], date1[1]-1, date1[2]);
      var new_date2 = new Date(date2[0], date2[1]-1, date2[2]);
      var diff = Math.abs(new_date1.getTime() - new_date2.getTime());
      return Math.ceil(diff/(1000 * 60 * 60 * 24));
    }

    /* Scrape data from each row of DISCO dashboard website  */
    $('tr').each(function(){
      var json2 = { no : "", id_num : "", resource_name : "", service : "", views : "", records : "", version : "", ver_date : "", status1 : "", checked : "", type : "", crawl : "", status2 : "", date : ""};
      var json1 = { id_num : ""};

       var data = $(this);
       no = data.children().first().text().replace(/[\n\t\r]/g,"");
       id_num = data.children().eq(1).text().replace(/[\n\t\r]/g,"");
       resource_name = data.children().eq(2).text().replace(/[\n\t\r]/g,"");
       service = data.children().eq(3).text().replace(/[\n\t\r]/g,"");
       views = data.children().eq(4).text().replace(/[\n\t\r]/g,"");
       records = data.children().eq(5).text().replace(/[\n\t\r]/g,"");
       version = data.children().eq(6).text().replace(/[\n\t\r]/g,"");
       ver_date = data.children().eq(7).text().replace(/[\n\t\r]/g,"");
       status1 = data.children().eq(8).find('img').attr('title');
       checked = data.children().eq(9).text().replace(/[\n\t\r]/g,"");
       type = data.children().eq(10).find('img').attr('title');
       if (data.children().eq(11).find('img').attr('title') == null) {
         crawl = "";
       }
       else {
         crawl = data.children().eq(11).find('img').attr('title');
       }
       status2 = data.children().eq(12).find('img').attr('title');
       date = data.children().eq(13).text().replace(/[\n\t\r]/g,"");

       json1.id_num = id_num;

       json2.no = no;
       json2.id_num = id_num;
       json2.resource_name = resource_name;
       json2.service = service;
       json2.views = views;
       json2.records = records;
       json2.version = version;
       json2.ver_date = ver_date;
       json2.status1 = status1;
       json2.checked = checked;
       json2.type = type;
       json2.crawl = crawl;
       json2.status2 = status2;
       json2.date = date;


      if (isNumber(no)) {
        output.push(json2);
        if (views != 0) {
          if (type != "Archive resource") {
            if (status2 != "Manual import") {
                if (status2 == "Scheduled, paused")
                    src_config.push(json1);
                // older than 31 days
                else if (diff_between_todays_date(checked) >= 31) {
                    if ((ver_date == checked) && (diff_btwn_two_dates(checked, date) < 6))
                        recrawl.push(json1);
                    else
                        check_src.push(json1);
                //
                // if (((ver_date != checked) || (diff_between_todays_date(checked) >= 4)) && type != "Scheduled, paused")
                //   check_src.push(json1);
                }
                else if (status1 != "No changes" && diff_btwn_two_dates(checked, date) >= 6) {
                    src_imported.push(json1);
              }
            }
          }
        }
      }
    })
}

/* convert json data to csv */
function convert2csv(filename, title, data, showlabel) {

  var arrData = typeof data != 'object' ? JSON.parse(data) : data;

  var csv = '';
  csv += title + '\r\n\n';

  if (showlabel) {
    var row = "";

    for (var index in arrData[0]) {
      row += index + ',';

    }
    row = row.slice(0, -1);

    csv += row + '\r\n';
  }

  for (var i = 0; i < arrData.length; i++) {
    var row = "";

    for (var index in arrData[i]) {
      row += arrData[i][index];
    }

    row.slice(0, row.length - 1);

    csv += row + '\r\n';
  }

  if (csv == '') {
    csv = "n/a"
  }

  /*
  fs.writeFile(filename, csv, function (err) {
    if (err) return console.log(err);
      console.log('File successfully written -- ' + filename);
  });
  */

  return csv;
}

var currentTime = new Date();

// get data in csv form
var recrawl = convert2csv('recrawl.txt', 'Recrawl - Last crawl over a month ago:', recrawl, true);
var src_imported = convert2csv('src_imported.txt', 'Within the Past Month - Source crawled, needs to be checked:', src_imported, true);
var src_config = convert2csv('src_config.txt', 'Source Configuration - Being fixed by DISCO developers:', src_config, true);
var check_src = convert2csv('check_src.txt', 'Check Source - Last approved crawl over a month ago:', check_src, true);

finalemail = recrawl.concat("\n" + check_src, "\n" + src_imported, "\n" + src_config, "\n" + currentTime);

/* write concatonated data to finalemail.txt to eventually send to users*/
console.log(finalemail);

});
