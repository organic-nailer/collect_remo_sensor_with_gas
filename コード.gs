//{
//  "name": "",
//  "te": 0.0,
//  "hu": 00,
//  "il": 000
//}

//日時の表示形式 2019/02/12 18:54:10

//一定時間ごとにnature remoから記録
function RecordMyRoomCondition(){
    var sheet = GetSheet();
    
    var v = GetMyRoomsConditionValue();
    
    var name = v.name;
    var temperature = v.te;
    var humidity = v.hu;
    var illumination = v.il;
    
    var date_now = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss");
    sheet.appendRow([date_now, temperature, humidity, illumination]);
}

//nature remoから値を取ってくる
function GetMyRoomsConditionValue(){
    var url = "https://api.nature.global/1/devices";
    var header = {
        "accept": "application/json",
        "Authorization": "Bearer " + PropertiesService.getScriptProperties().getProperty("remo_secret")
    }
    var options = {
        "headers": header
    }
    Logger.log(options);
    var response = UrlFetchApp.fetch(url, options).getContentText();
    Logger.log(response);
    var json = JSON.parse(response);
    Logger.log(json);
    var values = {
        "name": json[0].name,
        "te": json[0].newest_events.te.val,
        "hu": json[0].newest_events.hu.val,
        "il": json[0].newest_events.il.val
    }
    Logger.log(values);
    return values;
}

function CreateDayGraph(){
    var sheet = GetSheet();
    var list = GetConditionList();
    
    //昨日の分のデータを探索
    var today0 = new Date(new Date().setHours(0,0,0,0));
    
    var yesterday0 = CalcAfterNDay(today0, -1);
    [FirstValueIndex, LastValueIndex] = SearchBetweenDays(list, yesterday0, today0);
    
    RemoveAllCharts(sheet);
    //データにてグラフを作成
    var YesterdayDataRange = sheet.getRange(FirstValueIndex + 2, 1, LastValueIndex - FirstValueIndex + 1, 4);
    var chart = sheet.newChart()
                     .addRange(YesterdayDataRange)
                     .asLineChart()
                     .setColors(["#FF9800", "#00BCD4", "#CDDC39"])
                     .setOption("series", { 2: { targetAxisIndex: 1 } } )
                     .setPosition(2, 6, 0, 0)
                     .build();
    sheet.insertChart(chart);
    
    SaveChartToDrive(chart, yesterday0);
}

function SaveChartToDrive(chart, date){
    var folderid = PropertiesService.getScriptProperties().getProperty("drive_chart_id");
    try{
        var graphimg = chart.getBlob();
          DriveApp.getFolderById(folderid)
              .createFile(graphimg)
              .setName(Utilities.formatDate(date, 'Asia/Tokyo', 'YYYY_MM_dd'));
    }
    catch(e){
        Logger.log(e);
    }
}

function RemoveAllCharts(sheet){
    var charts = sheet.getCharts();
    
    for(var i = 0; i < charts.length; i++){
        sheet.removeChart(charts[i]);
    }
}

function CalcAfterNDay(date, NumberofDays){
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + NumberofDays);
}

function RemoveLastWeekValue(thismonday0){
    var sheet = GetSheet();
    var lastmonday0 = CalcAfterNDay(thismonday0, -7);
    
    var listrange = GetConditionListRange();
    var list = listrange.getValues();
    
    [first, last] = SearchBetweenDays(list, lastmonday0, thismonday0);
    
    var lastweekdata = list.splice(0, last + 1);
    sheet.deleteRows(2, lastweekdata.length);
    
    
    ExportCSV(lastweekdata, lastmonday0);
}

function GetConditionList(){
    var list = GetConditionListRange().getValues();
    
    return list;
}

function GetConditionListRange(){
    var sheet = GetSheet();
    
    return sheet.getRange(2, 1, sheet.getLastRow() - 1, 4);
}

function SearchBetweenDays(list, Dayfrom, Dayto){
    var FirstValueIndex = -1;
    var LastValueIndex = -1;
    for(var i = 0; i < list.length; i++){
        if(FirstValueIndex == -1 && Dayfrom <= list[i][0])　FirstValueIndex = i;
        if(LastValueIndex == -1 && Dayto <= list[i][0]) LastValueIndex = i - 1;
    }
    if(FirstValueIndex == -1 
        || LastValueIndex == FirstValueIndex - 1) throw new Error("データが見つかりません。");
    if(LastValueIndex == -1) LastValueIndex = list.length - 1;
    
    return [FirstValueIndex, LastValueIndex];//Listでの最初の位置と最後の位置を返す(シートには対応しない)
}

function ExportCSV(data, date){
    data.unshift(["日時", "温度", "湿度", "照度"]);
    var csv = CreateCSV(data);
    var folderid = PropertiesService.getScriptProperties().getProperty("drive_csv_id");
    
    try{
        var blob = Utilities
            .newBlob(csv, "text/csv", Utilities.formatDate(date, 'Asia/Tokyo', 'YYYY_MM_dd') + ".csv");
            //.setDataFromString(csv, "utf-8");
        DriveApp.getFolderById(folderid)
                .createFile(blob);
    }
    catch(e){
        Logger.log(e);
    }
}

function CreateCSV(data){
    var csv = "";
    
    for(var i = 0; i < data.length; i++){
        csv += data[i].join(',') + "\r\n";
    }
    
    return csv;
}

function GetSheet(){
    return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty("remo_sheetid")).getSheetByName("records");
}






















