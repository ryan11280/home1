import React, { useState, useMemo } from 'react'
import ReactDOM from 'react-dom/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import jsPDF from 'jspdf'
import './App.css' // 引入樣式

// --- 修復 Leaflet 預設圖示問題 ---
// (這是 React + Leaflet 常見的錯誤)
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
})
// --- 修復結束 ---

// 房產資料結構
interface Property {
  id: string
  title: string
  address: string
  price: number
  downPayment: number // 頭期款 (元)
  loanYears: number
  interestPct: number
  monthlyFees: number // 管理費等
  commuteMinutes: number
  commuteCostMonthly: number
  areaPing: number
  layout: string
  ageYears: number
  lat: number
  lon: number
  notes: string
}

// 根據您的筆記預載入的範例資料
const sampleData: Property[] = [
  {
    "id": "ryan-yl-01",
    "title": "宜蘭五結全新裝潢透天",
    "address": "宜蘭縣五結鄉五結中路二段117巷32弄10號",
    "price": 9380000,
    "downPayment": 3760000, // 自備款376萬
    "loanYears": 30, // 假設30年
    "interestPct": 2.2, // 假設2.2%
    "monthlyFees": 0,
    "commuteMinutes": 90,
    "commuteCostMonthly": 2300,
    "areaPing": 31.44,
    "layout": "3房2廳2衛",
    "ageYears": 46,
    "lat": 24.686, // 估算座標
    "lon": 121.784, // 估算座標
    "notes": "屋齡高、自備款較高、需早起通勤。"
  },
  {
    "id": "ryan-ty-01",
    "title": "桃園龜山 A7 大亮波波（2房）",
    "address": "桃園市龜山區樂善二路213號",
    "price": 11230000,
    "downPayment": 3534000, // 交屋前總繳 353.4萬
    "loanYears": 30,
    "interestPct": 2.2,
    "monthlyFees": 50 * 21.9, // 假設室內13.8 + 陽台 + 公設 (權狀31.9 - 車位10 = 21.9坪)
    "commuteMinutes": 20, // 假設
    "commuteCostMonthly": 1000, // 假設
    "areaPing": 21.9, // 扣除車位
    "layout": "2房1廳1衛",
    "ageYears": 0,
    "lat": 25.044, // 估算座標
    "lon": 121.392, // 估算座標
    "notes": "預售屋轉約自備款高，資金壓力大。"
  },
  {
    "id": "ryan-ty-02",
    "title": "桃園龜山 A7 大亮波波（1房 事務所）",
    "address": "桃園市龜山區樂善二路213號",
    "price": 7990000,
    "downPayment": 2080000, // 自備款208萬
    "loanYears": 30,
    "interestPct": 2.2,
    "monthlyFees": 50 * 15.06, // 權狀25.06 - 車位10 = 15.06坪
    "commuteMinutes": 20,
    "commuteCostMonthly": 1000,
    "areaPing": 15.06, // 扣除車位
    "layout": "1房1廳1衛（事務所）",
    "ageYears": 0,
    "lat": 25.044, // 估算座標
    "lon": 121.392, // 估算座標
    "notes": "事務所用途，空間狹小。"
  }
];

// 財務計算 (本息平均攤還)
const calculateMonthlyPayment = (principal: number, years: number, annualRate: number) => {
  if (principal <= 0 || years <= 0 || annualRate <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  const numberOfPayments = years * 12;
  const payment =
    principal *
    (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
  return Math.round(payment);
};

// 主應用程式
function App() {
  const [properties, setProperties] = useState<Property[]>(sampleData);
  const [selectedId, setSelectedId] = useState<string | null>(sampleData[0]?.id || null);

  // 計算衍伸數據
  const processedData = useMemo(() => {
    return properties.map(p => {
      const loanAmount = p.price - p.downPayment;
      const monthlyMortgage = calculateMonthlyPayment(loanAmount, p.loanYears, p.interestPct);
      const monthlyTotalCost = monthlyMortgage + p.monthlyFees + p.commuteCostMonthly;
      const pricePerPing = Math.round(p.price / p.areaPing);

      return {
        ...p,
        loanAmount,
        monthlyMortgage,
        monthlyTotalCost,
        pricePerPing,
      };
    });
  }, [properties]);

  const selectedProperty = processedData.find(p => p.id === selectedId);

  // 匯出 PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.addFont('public/NotoSansTC-Regular.ttf', 'NotoSansTC', 'normal'); // 假設字體放在 public/
    doc.setFont('NotoSansTC');
    
    doc.text("房產決策助理 - 比較報告", 10, 10);
    let y = 20;

    processedData.forEach(p => {
      doc.text(`物件: ${p.title}`, 10, y);
      doc.text(`總價: $${p.price.toLocaleString()}`, 10, y + 5);
      doc.text(`頭期款: $${p.downPayment.toLocaleString()}`, 10, y + 10);
      doc.text(`預估月付 (含管理/通勤): $${p.monthlyTotalCost.toLocaleString()}`, 10, y + 15);
      doc.text(`通勤時間: ${p.commuteMinutes} 分鐘`, 10, y + 20);
      y += 30;
    });
    
    doc.save("property_comparison.pdf");
    alert("注意：PDF 中文顯示需要額外嵌入字體，若顯示亂碼請檢查字體檔路徑。");
  };

  // TODO: 加入新增/編輯物件的表單功能
  // (目前為簡化，僅顯示列表)

  return (
    <>
      <h1>房產決策助理</h1>
      <div className="container">
        <div className="form-column">
          <h2>物件列表</h2>
          <ul className="property-list">
            {processedData.map(p => (
              <li
                key={p.id}
                className={`property-item ${p.id === selectedId ? 'selected' : ''}`}
                onClick={() => setSelectedId(p.id)}
              >
                <h3>{p.title}</h3>
                <p>總價: <strong>${p.price.toLocaleString()}</strong></p>
                <p>預估總月付: <strong>${p.monthlyTotalCost.toLocaleString()}</strong></p>
              </li>
            ))}
          </ul>
          <button onClick={handleExportPDF}>匯出 PDF 報告</button>
        </div>

        <div className="results-column">
          {selectedProperty ? (
            <div className="property-details">
              <h2>{selectedProperty.title}</h2>
              <p><strong>地址:</strong> {selectedProperty.address}</p>
              <p><strong>格局:</strong> {selectedProperty.layout} | <strong>坪數:</strong> {selectedProperty.areaPing} 坪 | <strong>屋齡:</strong> {selectedProperty.ageYears} 年</p>
              <p><strong>筆記:</strong> {selectedProperty.notes}</p>
              
              <MapContainer 
                center={[selectedProperty.lat, selectedProperty.lon]} 
                zoom={16} 
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[selectedProperty.lat, selectedProperty.lon]}>
                  <Popup>{selectedProperty.title}</Popup>
                </Marker>
              </MapContainer>
            </div>
          ) : (
            <p>請從左側選擇一個物件</p>
          )}

          <hr />
          
          <h3>財務比較圖</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={processedData}>
              <XAxis dataKey="title" />
              <YAxis />
              <Tooltip formatter={(value: number) => value.toLocaleString()} />
              <Legend />
              <Bar dataKey="price" name="總價" fill="#8884d8" />
              <Bar dataKey="downPayment" name="頭期款" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>

          <h3>每月成本比較圖</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={processedData}>
              <XAxis dataKey="title" />
              <YAxis />
              <Tooltip formatter={(value: number) => value.toLocaleString()} />
              <Legend />
              <Bar dataKey="monthlyTotalCost" name="預估總月付" fill="#ffc658" />
              <Bar dataKey="monthlyMortgage" name="純房貸" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)