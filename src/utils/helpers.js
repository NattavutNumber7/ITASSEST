import { LOGO_URL, COMPANY_INFO, STATUSES } from '../config.jsx';

// ✅ ฟังก์ชันช่วยเติมเลข 0 ให้ครบ 5-6 หลัก (สำหรับรหัสพนักงาน)
const formatEmployeeId = (id) => {
  if (!id) return '';
  let cleanId = id.toString().trim();
  
  if (!isNaN(cleanId) && cleanId !== '') {
      return cleanId.padStart(6, '0'); 
  }
  
  return cleanId;
};

// 🔒 SECURITY FIX: ฟังก์ชันสำหรับ Escape HTML เพื่อป้องกัน XSS Attack
// ป้องกันกรณีที่มีคนตั้งชื่อพนักงานหรือทรัพย์สินด้วย Script เช่น <script>alert('hacked')</script>
const escapeHtml = (unsafe) => {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const parseCSV = (text) => {
  if (!text) return [];
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  
  return lines.slice(1).map(line => {
    // Regex นี้อาจจะยังไม่ cover ทุกกรณีของ CSV แต่เพียงพอสำหรับ Google Sheets export
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    const cleanCol = (col) => col ? col.replace(/^"|"$/g, '').trim() : '';

    if (cols.length < 5) return null;

    return {
      id: formatEmployeeId(cleanCol(cols[0])),
      name: cleanCol(cols[1]),
      nickname: cleanCol(cols[2]),
      department: cleanCol(cols[3]), 
      position: cleanCol(cols[4]),   
      email: cleanCol(cols[5]),
      status: cleanCol(cols[6]) || 'Active'
    };
  }).filter(item => item !== null);
};

// ✅ ฟังก์ชันสำหรับดึงข้อมูล Laptop (ปรับปรุง Logic สถานะให้แม่นยำขึ้น)
export const parseLaptopCSV = (text) => {
  if (!text) return [];
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  return lines.slice(1).map(line => {
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    const cleanCol = (col) => col ? col.replace(/^"|"$/g, '').trim() : '';

    if (cols.length < 4) return null; 

    const brand = cleanCol(cols[0]);
    const name = cleanCol(cols[1]);
    const serialNumber = cleanCol(cols[2]);
    const employeeId = formatEmployeeId(cleanCol(cols[3]));
    const location = cleanCol(cols[4]); // อ่าน Column E (ชื่อคลัง/สถานที่)
    
    let rawStatus = cols.length > 9 ? cleanCol(cols[9]) : ''; 
    const s = rawStatus.toLowerCase().trim();
    
    let status = 'available'; 
    let isCentral = false;

    // ✅ Logic ใหม่: เรียงลำดับความสำคัญให้ถูกต้อง
    if (s.includes('lost')) {
        status = 'lost';
    } else if (s.includes('damaged') || s.includes('broken') || s.includes('write-off')) {
        status = 'broken';
    } else if (s.includes('pending') || s.includes('repair')) {
        status = 'repair';
    } else {
        if (employeeId) {
            status = 'assigned';
        } else if (location) {
            status = 'assigned';
            isCentral = true;
        } else {
            if (s.includes('active') && !s.includes('stock')) {
                 status = 'assigned';
            } else {
                 status = 'available';
            }
        }
    }

    return {
      brand,
      name,
      serialNumber,
      employeeId,
      location, 
      category: 'laptop',
      isRental: false,
      isCentral,
      status
    };
  }).filter(item => item !== null);
};

export const generateHandoverHtml = (asset) => {
  const dateObj = new Date();
  const day = dateObj.getDate();
  const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  const month = monthNames[dateObj.getMonth()];
  const year = dateObj.getFullYear() + 543;
  const shortDateStr = `${day}/${dateObj.getMonth()+1}/${year.toString().slice(-2)}`;

  // 🔒 SECURITY FIX: Sanitize ข้อมูลก่อนนำไปแสดงผลใน HTML
  const safeAssetName = escapeHtml(asset.name);
  const safeSerialNumber = escapeHtml(asset.serialNumber);
  const safeReceiverName = escapeHtml(asset.assignedTo || '.......................................................................');
  const safeCompanyName = escapeHtml(COMPANY_INFO.companyName);
  const safeAuthorizedName = escapeHtml(COMPANY_INFO.authorizedName);
  const safeWitnessName = escapeHtml(COMPANY_INFO.witnessName);

  return `
    <html>
      <head>
        <title>แบบบันทึกรับ – คืนทรัพย์สินบริษัท - ${safeSerialNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
        <style>
          @page { size: A4; margin: 15mm 20mm; }
          body { font-family: 'Sarabun', sans-serif; font-size: 14px; line-height: 1.5; color: #000; padding: 20px; }
          .header { text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 20px; }
          .date-line { text-align: center; margin-bottom: 20px; }
          .content { text-align: justify; margin-bottom: 12px; }
          .indent { text-indent: 40px; }
          .bold { font-weight: bold; }
          
          .signatures { 
            margin-top: 40px; 
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            padding-right: 50px;
          }
          .sign-box { 
            width: 400px;
            text-align: left;
            margin-bottom: 30px;
          }
          
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th, td { border: 1px solid black; padding: 5px; text-align: center; vertical-align: middle; height: 25px; }
          th { background-color: #f9f9f9; }
          
          .note { margin-top: 10px; font-size: 12px; font-weight: bold; }
          
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
          <img src="${LOGO_URL}" style="position: absolute; top: 20px; left: 20px; width: 100px; height: auto;" />
          <div class="header">แบบบันทึกรับ – คืนทรัพย์สินบริษัท</div>
          <div class="date-line">วันที่ ${day} เดือน ${month} พ.ศ. ${year}</div>
          
          <div class="content indent">
              แบบบันทึกฉบับนี้จัดทำขึ้นระหว่าง <b>${safeCompanyName}</b> โดย <b>${safeAuthorizedName}</b> เป็นผู้รับมอบอำนาจช่วงจากกรรมการผู้มีอำนาจลงนามผูกพัน ${safeCompanyName} ซึ่งต่อไปในแบบบันทึกนี้เรียกว่า “ผู้ให้” ฝ่ายหนึ่ง และ <b>${safeReceiverName}</b> ซึ่งต่อไปในแบบบันทึกนี้เรียกว่า “ผู้รับ” ทั้งสองฝ่ายตกลงลงนามในแบบบันทึกฉบับนี้ โดยมีข้อความดังต่อไปนี้
          </div>

          <div class="content indent"><b>ข้อ 1.</b> ผู้รับตกลงรับทรัพย์สินของบริษัท ซึ่งได้แก่ทรัพย์สิน ตามแบบบันทึกการรับ - คืน อุปกรณ์คอมพิวเตอร์ อุปกรณ์ต่อพ่วง และอุปกรณ์สื่อสารโทรคมนาคม (หน้า 2) โดยเป็นการให้ยืมใช้งานในขณะปฏิบัติงานกับ ${safeCompanyName} เท่านั้น</div>
          <div class="content indent"><b>ข้อ 2.</b> ผู้รับขอให้แบบบันทึกฉบับนี้ถือว่าเป็นการนำทรัพย์ของบริษัทไปใช้เพื่อประโยชน์ของบริษัท ผู้รับจะไม่นำไปใช้การอย่างอื่นนอกจากการอันเป็นปกติแก่ทรัพย์สินที่ยืมไป และไม่นำทรัพย์สินที่ยืมออกไปให้บุคคลอื่นใช้สอยโดยปราศจากความยินยอมเป็นลายลักษณ์อักษรจากบริษัท</div>
          <div class="content indent"><b>ข้อ 3.</b> ผู้รับต้องดูแล และรักษาทรัพย์สินที่ยืมจากบริษัทไป โดยอิงจากประกาศบริษัทเรื่อง นโยบายความรับผิดชอบต่อทรัพย์สินของบริษัท</div>
          <div class="content indent"><b>ข้อ 4.</b> หากปรากฏว่าทรัพย์สินที่ผู้รับได้รับการสูญหาย ชำรุดเสียหาย บุบสลาย หรืออย่างใดอย่างหนึ่ง โดยตรวจสอบภายหลังแล้วพบว่าเกิดจากความจงใจ หรือความประมาท เลินเล่อ ขาดความเอาใจใส่ หรือการใช้งานโดยผิดประเภท ผู้รับจะต้องชดใช้ค่าเสียหายอ้างอิงตามประกาศบริษัท เรื่อง นโยบายความรับผิดชอบต่อทรัพย์สินของบริษัท</div>
          <div class="content indent"><b>ข้อ 5.</b> เมื่อผู้รับสิ้นสุดการเป็นพนักงานของบริษัท ผู้รับต้องคืนทรัพย์สินให้แก่บริษัทในสภาพที่ดี ใช้งานได้ดังเดิมเหมือนในขณะยืมทรัพย์สินไปทุกประการ (เว้นแต่จะเป็นการเสื่อมสภาพตามปกติทรัพย์สิน)</div>
          <div class="content indent"><b>ข้อ 6.</b> ผู้รับจะต้องตรวจเช็คอุปกรณ์ให้เรียบร้อยก่อนเซ็นรับอุปกรณ์ หากพบว่าอุปกรณ์ไม่สมบูรณ์ ให้รีบแจ้งกับ People Team หรือ IT หากเซ็นรับไปแล้วถือว่าได้รับเครื่องในสภาพที่สมบูรณ์ หรือใช้งานได้ปกติ</div>
          <div class="content indent"><b>ข้อ 7.</b> เพื่อวัตถุประสงค์ในการรักษาความมั่งคงปลอดภัยในข้อมูลและทรัพย์สินของผู้ให้ ผู้รับตกลงและยินยอมให้ผู้ให้ติดตั้ง ตั้งค่า บริหารจัดการ และควบคุมดูแลระบบ Google Credential Provider for Windows (GCPW) หรือระบบอื่นใดในลักษณะเดียวกัน นอกจากนี้ ผู้รับตกลงและรับทราบว่าข้อมูลใด ๆ ภายใต้การเข้าใช้งานในระบบดังกล่าวเป็นทรัพย์สินและกรรมสิทธิ์ของผู้ให้แต่เพียงผู้เดียว</div>
          
          <div class="content indent" style="margin-top: 20px;">แบบบันทึกนี้ทั้งสองฝ่ายได้อ่าน และเข้าใจดีแล้ว จึงลงลายมือชื่อไว้ต่อหน้าพยานเป็นสำคัญ</div>

          <div class="signatures">
              <div class="sign-box">
                  ลงชื่อ ........................................................... ผู้ให้ (บริษัท)<br>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;( ${safeAuthorizedName} )
              </div>
              <div class="sign-box">
                  ลงชื่อ ........................................................... ผู้รับ<br>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;( ........................................................... )
              </div>
              <div class="sign-box">
                  ลงชื่อ ........................................................... พยาน<br>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;( ${safeWitnessName} )
              </div>
          </div>

          <div style="page-break-before: always;"></div>

          <div class="header" style="text-align: left; font-size: 16px;">รายการ การรับ - คืน อุปกรณ์คอมพิวเตอร์ อุปกรณ์ต่อพ่วง และอุปกรณ์สื่อสารโทรคมนาคม ดังมีรายการต่อไปนี้</div>
          
          <table>
              <thead>
                  <tr>
                      <th rowspan="2" style="width: 5%;">ลำดับ</th>
                      <th rowspan="2" style="width: 30%;">รายการทรัพย์สิน</th>
                      <th rowspan="2" style="width: 25%;">หมายเลขอุปกรณ์ / Serial Number</th>
                      <th colspan="5">รับทรัพย์สิน</th>
                      <th colspan="5">คืนทรัพย์สิน</th>
                  </tr>
                  <tr>
                      <th>ว/ด/ป</th>
                      <th>ผู้รับ</th>
                      <th>IT</th>
                      <th>ปกติ</th>
                      <th>ชำรุด</th>
                      <th>ว/ด/ป</th>
                      <th>ผู้คืน</th>
                      <th>IT</th>
                      <th>ปกติ</th>
                      <th>ชำรุด</th>
                  </tr>
              </thead>
              <tbody>
                  <tr>
                      <td>1</td>
                      <td>${safeAssetName}</td>
                      <td>${safeSerialNumber}</td>
                      <td>${shortDateStr}</td>
                      <td style="font-size: 10px;">${safeReceiverName.split('(')[0]}</td>
                      <td></td>
                      <td>✓</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                  </tr>
                  ${[2,3,4,5,6,7,8].map(num => `
                  <tr>
                      <td>${num}</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                  </tr>`).join('')}
              </tbody>
          </table>

          <div class="note">
              หมายเหตุ : หากอุปกรณ์เกิดการชำรุด หรือสูญหายด้วยกรณีใด ๆ ผู้รับต้องรับผิดชอบตามประกาศบริษัท เรื่อง นโยบายความรับผิดชอบต่อทรัพย์สินของบริษัท
          </div>

      </body>
    </html>
  `;
};

// ✅ เพิ่มฟังก์ชันใหม่สำหรับการ Export CSV
export const exportToCSV = (assets) => {
  if (!assets || assets.length === 0) return;

  const headers = [
    "Asset Name,Brand,Serial Number,Category,Status,Assigned To,Employee ID,Department,Position,Is Rental,Is Central,Location,Notes"
  ];

  const rows = assets.map(asset => {
    // ✅ แปลง Status ID เป็น Label ภาษาไทย
    const statusLabel = Object.values(STATUSES).find(s => s.id === asset.status)?.label || asset.status || '';

    return [
      `"${asset.name || ''}"`,
      `"${asset.brand || ''}"`,
      `"${asset.serialNumber || ''}"`,
      `"${asset.category || ''}"`,
      `"${statusLabel}"`, // ใช้ Label ภาษาไทย
      `"${asset.assignedTo || ''}"`,
      `"${asset.employeeId || ''}"`,
      `"${asset.department || ''}"`,
      `"${asset.position || ''}"`,
      `"${asset.isRental ? 'Yes' : 'No'}"`,
      `"${asset.isCentral ? 'Yes' : 'No'}"`,
      `"${asset.location || ''}"`,
      `"${(asset.notes || '').replace(/"/g, '""')}"` // Escape double quotes
    ].join(",");
  });

  const csvContent = "\uFEFF" + [headers, ...rows].join("\n"); // Add BOM for Excel thai support
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `IT_Assets_Export_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};