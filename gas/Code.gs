/**
 * 스마트 자리 바꾸기 - Google Apps Script (GAS) 서버 백엔드
 * 
 * 기능:
 * 1. doGet(): 웹 앱 HTML 렌더링
 * 2. loadClassroomData(): 구글 스프레드시트 또는 스크립트 속성에서 학급 데이터 불러오기
 * 3. saveClassroomData(): 학급 명단, 교실 배치, 특수 조건 및 이력 저장
 * 4. exportToSpreadsheet(): 현재 자리 배치표를 새 스프레드시트 시트로 생성하여 내보내기
 */

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('스마트 자리 바꾸기 - 교사 맞춤 스마트 학급 배치 시스템')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * 학급 데이터 불러오기
 */
function loadClassroomData() {
  try {
    var props = PropertiesService.getUserProperties();
    var data = props.getProperty('CLASSROOM_SEATING_DATA');
    if (data) {
      return { success: true, data: JSON.parse(data) };
    }
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 학급 데이터 저장하기
 */
function saveClassroomData(payloadJson) {
  try {
    var props = PropertiesService.getUserProperties();
    props.setProperty('CLASSROOM_SEATING_DATA', payloadJson);
    return { success: true, timestamp: new Date().toISOString() };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 현재 자리 배치표를 구글 스프레드시트 시트로 생성 및 서식 지정
 */
function exportToSpreadsheet(sheetTitle, gridMatrix) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      // 바운드 스크립트가 아닌 독립형 스크립트일 경우 새 시트 생성
      ss = SpreadsheetApp.create('스마트_자리배치표_' + sheetTitle);
    }

    var sheetName = sheetTitle || Utilities.formatDate(new Date(), "GMT+9", "yyyy-MM-dd_HHmm");
    var existing = ss.getSheetByName(sheetName);
    if (existing) {
      sheetName += '_' + Math.floor(Math.random() * 1000);
    }

    var sheet = ss.insertSheet(sheetName);

    // 제목 작성
    sheet.getRange(1, 1).setValue('🏫 [' + sheetTitle + '] 스마트 교실 자리 배치표');
    sheet.getRange(1, 1).setFontSize(14).setFontWeight('bold');

    // 칠판 표시 (앞쪽)
    var maxCols = gridMatrix[0] ? gridMatrix[0].length : 6;
    var boardRange = sheet.getRange(3, 1, 1, maxCols);
    boardRange.merge();
    boardRange.setValue('=== 칠 판 / 교 탁 (앞 쪽) ===');
    boardRange.setBackground('#1F3327').setFontColor('#FFFFFF').setHorizontalAlignment('center').setFontWeight('bold');

    // 좌석 매트릭스 삽입
    var startRow = 5;
    for (var r = 0; r < gridMatrix.length; r++) {
      var rowData = gridMatrix[r];
      var rowNum = startRow + (r * 2);
      
      for (var c = 0; c < rowData.length; c++) {
        var cell = sheet.getRange(rowNum, c + 1);
        var val = rowData[c];
        cell.setValue(val || '(빈자리)');
        cell.setBorder(true, true, true, true, false, false);
        cell.setHorizontalAlignment('center');
        cell.setVerticalAlignment('middle');
        
        if (val && val !== '빈자리') {
          cell.setBackground('#F2F9F5').setFontWeight('bold');
        } else {
          cell.setBackground('#FAFAFA').setFontColor('#9CA3AF');
        }
      }
    }

    return { 
      success: true, 
      spreadsheetUrl: ss.getUrl(),
      sheetName: sheetName 
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
