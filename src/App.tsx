// src/App.tsx (V7.0)
import React, { useState, useMemo, useEffect } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip,
  PieChart, Pie, Cell, Tooltip as PieTooltip // V7.0: 新增 PieChart
} from 'recharts'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
// V7.0: README.md 已更新
import readmeContent from '../README.md?raw' 


// --- Leaflet 圖示修正 ---
const redIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});
// --- 圖示修正結束 ---

// --- 資料結構定義 (V6.0) ---

type PropertyTag = string;
type PropertyStatus = 'pending' | 'viewing' | 'negotiating' | 'rejected' | 'purchased';

interface OneTimeCosts {
  brokerFee: number;
  deedTax: number;
  adminFee: number;
  renovation: number;
}

interface Property {
  id: string;
  title: string;
  address: string;
  price: number;
  downPayment: number;
  loanYears: number;
  interestPct: number;
  monthlyFees: number;
  areaPing: number;
  layout: string;
  ageYears: number;
  lat: number;
  lon: number;
  notes: string;
  tags: PropertyTag[];
  photoUrls: string[];
  oneTimeCosts: OneTimeCosts;
  commuteMinutes: number;
  commuteCostMonthly: number;
  status: PropertyStatus; 
  visitDate: string; 
}

interface Destination {
  id: string;
  name: string;
  address: string;
}

interface Weights {
  cost: number;
  commute: number;
  size: number;
  age: number;
}

interface Settings {
  googleMapsApiKey: string; 
  destinations: Destination[];
  weights: Weights;
}

type ProcessedProperty = Property & {
  loanAmount: number;
  monthlyMortgage: number;
  monthlyTotalCost: number;
  pricePerPing: number; // 萬/坪
  oneTimeCostTotal: number;
  trueTotalCost: number;
  scores: {
    cost: number;
    commute: number;
    size: number;
    age: number;
  };
  totalScore: number; // 最終加權總分
};

// --- 預設資料 (V6.0) ---

const DEFAULT_SETTINGS: Settings = {
  googleMapsApiKey: "",
  destinations: [
    { id: 'dest-1', name: '公司', address: '台北市信義區市府路45號' }
  ],
  weights: {
    cost: 40,
    commute: 30,
    size: 20,
    age: 10,
  }
};

const sampleData: Property[] = [
  {
    "id": "ryan-yl-01",
    "title": "宜蘭五結全新裝潢透天",
    "address": "宜蘭縣五結鄉五結中路二段117巷32弄10號",
    "price": 9380000,
    "downPayment": 3760000,
    "loanYears": 30,
    "interestPct": 2.2,
    "monthlyFees": 0,
    "commuteMinutes": 90,
    "commuteCostMonthly": 2300,
    "areaPing": 31.44,
    "layout": "3房2廳2衛",
    "ageYears": 46,
    "lat": 24.686,
    "lon": 121.784,
    "notes": "格局方正，使用空間大。7年前全屋翻修過。\n加分：空間大、可直接入住、採光佳、基本生活機能算完善。\n猶豫：屋齡高、自備款較高、需早起通勤。",
    "tags": [ "透天", "宜蘭", "屋齡高" ],
    "photoUrls": [],
    "oneTimeCosts": { "brokerFee": 0, "deedTax": 100000, "adminFee": 50000, "renovation": 0 },
    "status": "viewing",
    "visitDate": "2025-11-08"
  },
  {
    "id": "ryan-ty-01",
    "title": "桃園龜山 A7 大亮波波 (2房)",
    "address": "桃園市龜山區樂善二路213號",
    "price": 11230000,
    "downPayment": 3534000,
    "loanYears": 30,
    "interestPct": 2.2,
    "monthlyFees": 1095,
    "commuteMinutes": 30,
    "commuteCostMonthly": 1280,
    "areaPing": 21.9,
    "layout": "2房1廳1衛",
    "ageYears": 0,
    "lat": 25.044,
    "lon": 121.392,
    "notes": "屋主有客變，動線規劃滿用心。窗戶面西。\n加分：生活機能完善、通勤方便、電動車友善、後續增值可能性佳。\n猶豫：預售屋轉約自備款較高，資金必須很充足。",
    "tags": [ "預售屋", "A7", "近捷運", "電動車友善" ],
    "photoUrls": [ "https://price.houseprice.tw/dealcase/8663932/" ],
    "oneTimeCosts": { "brokerFee": 0, "deedTax": 120000, "adminFee": 50000, "renovation": 300000 },
    "status": "rejected",
    "visitDate": "2025-11-06"
  },
  {
    "id": "ryan-ty-02",
    "title": "桃園龜山 A7 大亮波波 (1房 事務所)",
    "address": "桃園市龜山區樂善二路213號",
    "price": 7990000,
    "downPayment": 2080000,
    "loanYears": 30,
    "interestPct": 2.2,
    "monthlyFees": 753,
    "commuteMinutes": 30,
    "commuteCostMonthly": 1280,
    "areaPing": 15.06,
    "layout": "1房1廳1衛 (事務所)",
    "ageYears": 0,
    "lat": 25.044,
    "lon": 121.392,
    "notes": "僅一房，空間動線壅擠狹小。低樓層未來恐會遭遮擋。\n加分：繳納款項相對能負擔。\n猶豫：一房空間狹小，車位偏小，事務所用途又較複雜。",
    "tags": [ "預售屋", "A7", "事務所" ],
    "photoUrls": [ "https://community.houseprice.tw/building/165034/doorplate" ],
    "oneTimeCosts": { "brokerFee": 0, "deedTax": 80000, "adminFee": 50000, "renovation": 100000 },
    "status": "pending",
    "visitDate": "2025-11-10"
  },
  {
    "id": "leju-yl-01",
    "title": "新家源源翠大苑",
    "address": "宜蘭縣壯圍鄉美功路一段2巷45-1號",
    "price": 7560000,
    "downPayment": 1512000,
    "loanYears": 30,
    "interestPct": 2.2,
    "monthlyFees": 1531,
    "commuteMinutes": 90,
    "commuteCostMonthly": 2300,
    "areaPing": 25.52,
    "layout": "2房",
    "ageYears": 0,
    "lat": 24.757,
    "lon": 121.77,
    "notes": "新成屋。公設比 22％。RC構造。建設公司：新家源建設。",
    "tags": [ "新成屋", "宜蘭", "壯圍鄉" ],
    "photoUrls": [],
    "oneTimeCosts": { "brokerFee": 0, "deedTax": 80000, "adminFee": 50000, "renovation": 200000 },
    "status": "pending",
    "visitDate": ""
  },
  {
    "id": "591-ty-01",
    "title": "爾雅軒",
    "address": "桃園市新屋區三民路二段435巷",
    "price": 7650000,
    "downPayment": 1530000,
    "loanYears": 30,
    "interestPct": 2.2,
    "monthlyFees": 750,
    "commuteMinutes": 45,
    "commuteCostMonthly": 1280,
    "areaPing": 25,
    "layout": "2房",
    "ageYears": 0,
    "lat": 24.968,
    "lon": 121.104,
    "notes": "預售屋 (2026年Q1完工)。電梯公寓。低公設 23.77%。建設：堡居建設有限公司。",
    "tags": [ "預售屋", "新屋區", "低公設" ],
    "photoUrls": [],
    "oneTimeCosts": { "brokerFee": 0, "deedTax": 80000, "adminFee": 50000, "renovation": 200000 },
    "status": "pending",
    "visitDate": ""
  },
  {
    "id": "591-ty-02",
    "title": "風和之里",
    "address": "桃園市八德區山下街50巷60號旁",
    "price": 9675000,
    "downPayment": 1935000,
    "loanYears": 30,
    "interestPct": 2.2,
    "monthlyFees": 0,
    "commuteMinutes": 40,
    "commuteCostMonthly": 1280,
    "areaPing": 24.6,
    "layout": "2房",
    "ageYears": 0,
    "lat": 24.95,
    "lon": 121.3,
    "notes": "預售屋 (2029年上半年完工)。華廈。公設比 33%。建設：海喬建設股份有限公司。",
    "tags": [ "預售屋", "八德區", "近公園" ],
    "photoUrls": [],
    "oneTimeCosts": { "brokerFee": 0, "deedTax": 100000, "adminFee": 50000, "renovation": 200000 },
    "status": "pending",
    "visitDate": ""
  }
];

const NEW_PROPERTY_TEMPLATE: Property = {
  id: `new-${Date.now()}`,
  title: "新物件",
  address: "新北市板橋區",
  price: 15000000,
  downPayment: 3000000,
  loanYears: 30,
  interestPct: 2.2,
  monthlyFees: 2000,
  commuteMinutes: 30,
  commuteCostMonthly: 1280,
  areaPing: 28,
  layout: "3房2廳2衛",
  ageYears: 5,
  lat: 25.014,
  lon: 121.467,
  notes: "",
  tags: [],
  photoUrls: [],
  oneTimeCosts: { brokerFee: 150000, deedTax: 100000, adminFee: 50000, renovation: 500000 },
  status: "pending",
  visitDate: ""
};

// --- 財務計算 ---
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

// --- Hook: 讀寫 LocalStorage ---
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

// --- 正規化 (0-100) ---
const normalize = (val: number, min: number, max: number, invert: boolean = false) => {
  if (max === min) return 100;
  const score = 100 * (val - min) / (max - min);
  return invert ? 100 - score : score;
}

// --- V5.0: 導覽列組件 ---
interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onCloseMenu: () => void; // 用於行動版
}
function Navigation({ activeTab, setActiveTab, onCloseMenu }: NavigationProps) {
  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    onCloseMenu();
  };

  return (
    <nav className="main-nav">
      <h1>房產分析儀 v7.0</h1>
      <ul className="nav-menu">
        <li className="nav-item">
          <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => handleNavClick('dashboard')}>
            儀表板
          </button>
        </li>
        <li className="nav-item">
          <button className={activeTab === 'properties' ? 'active' : ''} onClick={() => handleNavClick('properties')}>
            物件列表
          </button>
        </li>
        <li className="nav-item">
          <button className={activeTab === 'map' ? 'active' : ''} onClick={() => handleNavClick('map')}>
            地圖總覽
          </button>
        </li>
        <li className="nav-item">
          <button className={activeTab === 'tools' ? 'active' : ''} onClick={() => handleNavClick('tools')}>
            分析工具 (V7)
          </button>
        </li>
        <li className="nav-item">
          <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => handleNavClick('settings')}>
            分析與設定
          </button>
        </li>
        <li className="nav-item">
          <button className={activeTab === 'about' ? 'active' : ''} onClick={() => handleNavClick('about')}>
            V7.0 說明 & 日誌
          </button>
        </li>
      </ul>
    </nav>
  );
}


// --- 主應用程式 APP ---
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings] = useLocalStorage<Settings>('pa-settings', DEFAULT_SETTINGS);
  const [properties, setProperties] = useLocalStorage<Property[]>('pa-properties', sampleData);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [compareList, setCompareList] = useLocalStorage<Set<string>>('pa-compare', new Set()); // V7.0: 記住比較列表
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [pinnedItems, setPinnedItems] = useLocalStorage<Set<string>>('pa-pinned', new Set()); // V7.0

  // --- 核心邏輯：計算分數 ---
  const processedData = useMemo((): ProcessedProperty[] => {
    if (properties.length === 0) return [];

    const costs = properties.map(p => {
      const loan = p.price - p.downPayment;
      const mortgage = calculateMonthlyPayment(loan, p.loanYears, p.interestPct);
      return mortgage + p.monthlyFees + p.commuteCostMonthly;
    });
    const commutes = properties.map(p => p.commuteMinutes);
    const sizes = properties.map(p => p.areaPing);
    const ages = properties.map(p => p.ageYears);

    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    const minCommute = Math.min(...commutes);
    const maxCommute = Math.max(...commutes);
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);
    const minAge = Math.min(...ages);
    const maxAge = Math.max(...ages);
    
    const totalWeight = settings.weights.cost + settings.weights.commute + settings.weights.size + settings.weights.age;
    
    return properties.map(p => {
      const loanAmount = p.price - p.downPayment;
      const monthlyMortgage = calculateMonthlyPayment(loanAmount, p.loanYears, p.interestPct);
      const monthlyTotalCost = monthlyMortgage + p.monthlyFees + p.commuteCostMonthly;
      const pricePerPing = p.areaPing > 0 ? Math.round((p.price / 10000) / p.areaPing * 10) / 10 : 0;
      const oneTimeCostTotal = Object.values(p.oneTimeCosts).reduce((a, b) => a + b, 0);
      const trueTotalCost = p.price + oneTimeCostTotal;

      const normCost = normalize(monthlyTotalCost, minCost, maxCost, true);
      const normCommute = normalize(p.commuteMinutes, minCommute, maxCommute, true);
      const normSize = normalize(p.areaPing, minSize, maxSize, false);
      const normAge = normalize(p.ageYears, minAge, maxAge, true);
      
      const scores = {
        cost: Math.round(normCost),
        commute: Math.round(normCommute),
        size: Math.round(normSize),
        age: Math.round(normAge),
      };

      let totalScore = 0;
      if (totalWeight > 0) {
        totalScore = (
          (normCost * settings.weights.cost) +
          (normCommute * settings.weights.commute) +
          (normSize * settings.weights.size) +
          (normAge * settings.weights.age)
        ) / totalWeight;
      }

      return {
        ...p,
        loanAmount,
        monthlyMortgage,
        monthlyTotalCost,
        pricePerPing,
        oneTimeCostTotal,
        trueTotalCost,
        scores,
        totalScore: Math.round(totalScore),
      };
    });
  }, [properties, settings.weights]);

  // --- 事件處理 ---
  const handleSaveProperty = (property: Property) => {
    setProperties(prev => {
      const exists = prev.some(p => p.id === property.id);
      if (exists) {
        return prev.map(p => p.id === property.id ? property : p);
      } else {
        return [...prev, property];
      }
    });
    setEditingProperty(null);
  };
  
  const handleDeleteProperty = (id: string) => {
    if (window.confirm("確定要刪除這個物件嗎？")) {
      setProperties(prev => prev.filter(p => p.id !== id));
      setCompareList(prev => {
        const newList = new Set(prev);
        newList.delete(id);
        return newList;
      });
      setPinnedItems(prev => {
        const newList = new Set(prev);
        newList.delete(id);
        return newList;
      });
    }
  };

  const handleStartAdd = () => {
    setEditingProperty({ ...NEW_PROPERTY_TEMPLATE, id: `new-${Date.now()}` });
  };
  
  // V6.0: API 功能改為提示模式
  const handleAnalyzeCommute = async () => {
    alert(`[功能限制說明]\n\n此功能 (通勤分析) 需要串接 Google Maps API。\n\n由於 GitHub Pages 靜態網站的 CORS 安全限制，此功能無法在線上版運作。\n\n您可以在本機下載專案，並在 vite.config.ts 中設定 'server.proxy' 來啟用此功能進行本地測試。`);
  };

  // V7.0: 釘選
  const handleTogglePin = (id: string) => {
    setPinnedItems(prev => {
      const newList = new Set(prev);
      if (newList.has(id)) {
        newList.delete(id);
      } else {
        if (newList.size >= 5) {
          alert("儀表板最多釘選 5 個物件。");
        } else {
          newList.add(id);
        }
      }
      return newList;
    });
  };
  
  // V6.0: 渲染主要頁面
  const renderActiveTab = () => {
    const pinnedProperties = processedData
      .filter(p => pinnedItems.has(p.id))
      .sort((a, b) => b.totalScore - a.totalScore);

    switch (activeTab) {
      case 'dashboard':
        return <DashboardView properties={properties} pinnedProperties={pinnedProperties} />;
      case 'properties':
        return <PropertiesListView
          properties={processedData}
          onAdd={handleStartAdd}
          onEdit={setEditingProperty}
          onDelete={handleDeleteProperty}
          onAnalyzeCommute={handleAnalyzeCommute}
          isLoading={isLoading}
          compareList={compareList}
          setCompareList={setCompareList}
          onOpenCompare={() => setIsCompareModalOpen(true)}
          pinnedItems={pinnedItems}
          onTogglePin={handleTogglePin}
        />;
      case 'map':
        return <MapView properties={processedData} />;
      case 'tools':
        return <ToolsInfoView properties={properties} settings={settings} />;
      case 'settings':
        return <SettingsView 
                  settings={settings} 
                  onSave={setSettings} // V7.0: 即時更新
                  properties={properties}
                  onImport={setProperties}
                />;
      case 'about':
        return <AboutView />;
      default:
        return <div>頁面不存在</div>;
    }
  };

  return (
    <div className="app-container">
      <div 
        className={`mobile-menu-overlay ${isMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMenuOpen(false)}
      ></div>
      <div className={`main-nav ${isMenuOpen ? 'open' : ''}`}>
        <Navigation 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onCloseMenu={() => setIsMenuOpen(false)}
        />
      </div>

      <main className="main-content">
        <button className="menu-toggle" onClick={() => setIsMenuOpen(true)}>
          ☰
        </button>

        {isLoading && <div style={{ color: 'yellow', fontWeight: 'bold' }}>[API 請求中...]</div>}
        {renderActiveTab()}
      </main>
      
      {editingProperty && (
        <PropertyFormModal
          property={editingProperty}
          onClose={() => setEditingProperty(null)}
          onSave={handleSaveProperty}
        />
      )}
      {isCompareModalOpen && (
        <CompareModal
          properties={processedData.filter(p => compareList.has(p.id))}
          onClose={() => setIsCompareModalOpen(false)}
        />
      )}
    </div>
  );
}

// --- 子組件：儀表板 (V7.0 已修正) ---
function DashboardView({ properties, pinnedProperties }: { 
  properties: ProcessedProperty[],
  pinnedProperties: ProcessedProperty[]
}) {
  // V7.0: 儀表板統計
  const stats = useMemo(() => {
    if (properties.length === 0) {
      return { count: 0, avgPrice: 0, maxScore: 0, avgPricePerPing: 0 };
    }
    const avgPrice = properties.reduce((acc, p) => acc + p.price, 0) / properties.length;
    const avgPricePerPing = properties.reduce((acc, p) => acc + p.pricePerPing, 0) / properties.length;
    const maxScore = Math.max(...properties.map(p => p.totalScore));
    return {
      count: properties.length,
      avgPrice: Math.round(avgPrice / 10000), // 萬
      avgPricePerPing: Math.round(avgPricePerPing * 10) / 10, // 萬/坪
      maxScore: maxScore,
    };
  }, [properties]);

  // V6.0: 修正雷達圖資料結構
  const radarData = useMemo(() => {
    const categories = ['成本', '通勤', '空間', '屋齡'];
    return categories.map(category => {
      const entry: any = { category };
      pinnedProperties.forEach(p => {
        const title = p.title.length > 10 ? p.title.substring(0, 10) + '...' : p.title;
        entry[title] = p.scores[category.toLowerCase() as keyof ProcessedProperty['scores']];
      });
      return entry;
    });
  }, [pinnedProperties]);
  
  const radarColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#83a6ed'];

  return (
    <div>
      <h2>儀表板</h2>

      {/* V7.0: 統計數據 */}
      <div className="stats-grid">
        <div className="stat-card">
          <h4>總物件數</h4>
          <p>{stats.count}</p>
        </div>
        <div className="stat-card">
          <h4>平均總價 (萬)</h4>
          <p>{stats.avgPrice.toLocaleString()}</p>
        </div>
         <div className="stat-card">
          <h4>平均單價 (萬/坪)</h4>
          <p>{stats.avgPricePerPing.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h4>最高推薦分</h4>
          <p>{stats.maxScore}</p>
        </div>
      </div>
      
      <p>
        此雷達圖顯示您**釘選**的物件 (最多 5 個) 的**各項偏好分數** (0-100分，越高越好)。
        {pinnedProperties.length === 0 && <span style={{color: 'var(--accent-warning)'}}><br/>請至「物件列表」點擊卡片上的 ☆ 釘選物件。</span>}
      </p>
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="category" />
            <PolarRadiusAxis angle={30} domain={[0, 100]} />
            {pinnedProperties.map((p, index) => (
              <Radar 
                key={p.id} 
                name={p.title.length > 10 ? p.title.substring(0, 10) + '...' : p.title} 
                dataKey={p.title.length > 10 ? p.title.substring(0, 10) + '...' : p.title} 
                stroke={radarColors[index % radarColors.length]} 
                fill={radarColors[index % radarColors.length]} 
                fillOpacity={0.6} 
              />
            ))}
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// V6.0: 狀態標籤對應
const statusMap: Record<PropertyStatus, string> = {
  pending: '待看屋',
  viewing: '已看屋',
  negotiating: '斡旋中',
  rejected: '已放棄',
  purchased: '已成交',
};

// --- 子組件：物件列表 (V7.0 已升級) ---
function PropertiesListView({ properties, onAdd, onEdit, onDelete, onAnalyzeCommute, isLoading, compareList, setCompareList, onOpenCompare, pinnedItems, onTogglePin }: {
  properties: ProcessedProperty[],
  onAdd: () => void,
  onEdit: (p: Property) => void,
  onDelete: (id: string) => void,
  onAnalyzeCommute: (p: Property) => void,
  isLoading: boolean,
  compareList: Set<string>,
  setCompareList: React.Dispatch<React.SetStateAction<Set<string>>>,
  onOpenCompare: () => void,
  pinnedItems: Set<string>,
  onTogglePin: (id: string) => void
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("totalScore");
  const [filterStatus, setFilterStatus] = useState<PropertyStatus | 'all'>('all'); // V7.0
  const [compareMode, setCompareMode] = useState(false);

  const filteredProperties = useMemo(() => {
    return properties
      .filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(p => filterStatus === 'all' || p.status === filterStatus) // V7.0
      .sort((a, b) => {
        switch (sortBy) {
          case 'price': return a.price - b.price;
          case 'pricePerPing': return a.pricePerPing - b.pricePerPing; // V7.0
          case 'age': return a.ageYears - b.ageYears;
          case 'visitDate': return (b.visitDate || '').localeCompare(a.visitDate || '');
          case 'totalScore':
          default:
            return b.totalScore - a.totalScore;
        }
      });
  }, [properties, searchTerm, sortBy, filterStatus]);
  
  const handleToggleCompare = (id: string) => {
    setCompareList(prev => {
      const newList = new Set(prev);
      if (newList.has(id)) {
        newList.delete(id);
      } else {
        if (newList.size >= 4) {
          alert("最多只能比較 4 個物件。");
        } else {
          newList.add(id);
        }
      }
      return newList;
    });
  };

  return (
    <div>
      <div className="list-header">
        <h2>物件列表 ({filteredProperties.length})</h2>
        <div>
          {compareMode && (
            <button 
              className="btn-success" 
              onClick={onOpenCompare}
              disabled={compareList.size < 2}
            >
              比較 {compareList.size} 個物件
            </button>
          )}
          <button 
            className="btn-secondary"
            onClick={() => setCompareMode(!compareMode)}
          >
            {compareMode ? '取消比較' : '開啟比較模式'}
          </button>
          <button className="btn-primary" onClick={onAdd}>＋ 新增物件</button>
        </div>
      </div>
      <div className="list-controls">
        <input
          type="text"
          placeholder="搜尋物件名稱..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {/* V7.0: 新增篩選/排序 */}
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
          <option value="all">篩選狀態 (全部)</option>
          {Object.entries(statusMap).map(([key, value]) => (
            <option key={key} value={key}>{value}</option>
          ))}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="totalScore">依推薦分排序 (高到低)</option>
          <option value="price">依總價排序 (低到高)</option>
          <option value="pricePerPing">依單價排序 (低到高)</option>
          <option value="age">依屋齡排序 (低到高)</option>
          <option value="visitDate">依賞屋日期排序 (新到舊)</option>
        </select>
      </div>
      <div className="property-list-grid">
        {filteredProperties.map(p => (
          <div 
            key={p.id} 
            className={`property-card ${compareMode && compareList.has(p.id) ? 'compare-selected' : ''}`}
            onClick={compareMode ? () => handleToggleCompare(p.id) : undefined}
          >
            {/* V7.0: 釘選按鈕 */}
            <button
              className={`pin-button ${pinnedItems.has(p.id) ? 'pinned' : ''}`}
              title={pinnedItems.has(p.id) ? '取消釘選' : '釘選到儀表板'}
              onClick={(e) => { e.stopPropagation(); onTogglePin(p.id); }}
            >
              {pinnedItems.has(p.id) ? '★' : '☆'}
            </button>
            
            {compareMode && (
              <input 
                type="checkbox"
                className="compare-checkbox"
                checked={compareList.has(p.id)}
                readOnly
              />
            )}
            
            <img 
              src={p.photoUrls[0] || 'https://via.placeholder.com/400x300.png?text=No+Image'}
              alt={p.title} 
              className="card-image"
              onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/400x300.png?text=Image+Error')}
            />
            <div className="card-header" style={{ marginTop: '0.5rem' }}>
              <h3>{p.title}</h3>
              <div className="card-score" title="綜合推薦分">{p.totalScore}</div>
            </div>
            <div className="card-body">
              <p>
                <span className={`status-tag status-${p.status}`}>{statusMap[p.status]}</span>
                {p.visitDate && <span>({p.visitDate})</span>}
              </p>
              <p>總價: <strong>${p.price.toLocaleString()}</strong></p>
              <p>單價: <strong>{p.pricePerPing.toLocaleString()} 萬/坪</strong></p>
              <p>總月付: <strong>${p.monthlyTotalCost.toLocaleString()}</strong></p>
              <p>通勤: <strong>{p.commuteMinutes} 分鐘</strong> | 坪數: <strong>{p.areaPing} 坪</strong></p>
              <div className="card-tags">
                {p.tags.map(tag => <span key={tag}>{tag}</span>)}
              </div>
            </div>
            {!compareMode && (
              <div className="card-actions">
                <button
                  className="btn-secondary"
                  title="分析通勤 (限本機)"
                  onClick={() => onAnalyzeCommute(p)}
                  disabled={isLoading}
                >
                  分析通勤
                </button>
                <button className="btn-secondary" onClick={() => onEdit(p)} disabled={isLoading}>編輯</button>
                <button className="btn-danger" onClick={() => onDelete(p.id)} disabled={isLoading}>刪除</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- 子組件：地圖總覽 (V3.0) ---
function MapView({ properties }: { properties: ProcessedProperty[] }) {
  const center: [number, number] = properties.length > 0 ? [properties[0].lat, properties[0].lon] : [25.033, 121.565];

  return (
    <div className="map-container-full">
      <MapContainer center={center} zoom={12} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {properties.map(p => (
          <Marker key={p.id} position={[p.lat, p.lon]} icon={redIcon}>
            <Popup>
              <div><strong>{p.title}</strong></div>
              <div>總價: ${p.price.toLocaleString()}</div>
              <div>分數: {p.totalScore}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

// --- 子組件：分析與設定 (V7.0 已升級) ---
function SettingsView({ settings, onSave, properties, onImport }: {
  settings: Settings,
  onSave: (settings: Settings) => void,
  properties: Property[],
  onImport: (properties: Property[]) => void
}) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [newDestName, setNewDestName] = useState("");
  const [newDestAddress, setNewDestAddress] = useState("");

  // V7.0: 即時儲存 (Debounced)
  useEffect(() => {
    // 當 localSettings 改變時，觸發 onSave (父層的 setSettings)
    const handler = setTimeout(() => {
      onSave(localSettings);
    }, 300); // 300ms 延遲
    return () => clearTimeout(handler);
  }, [localSettings, onSave]);
  
  // V7.0: 當父層 settings 改變時 (例如匯入)，同步 localSettings
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);


  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalSettings(prev => ({
      ...prev,
      weights: {
        ...prev.weights,
        [name]: Number(value)
      }
    }));
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSettings(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };
  
  const handleAddDestination = () => {
    if (!newDestName || !newDestAddress) {
      alert("請輸入名稱和地址");
      return;
    }
    const newDest: Destination = {
      id: `dest-${Date.now()}`,
      name: newDestName,
      address: newDestAddress,
    };
    setLocalSettings(prev => ({
      ...prev,
      destinations: [...prev.destinations, newDest]
    }));
    setNewDestName("");
    setNewDestAddress("");
  };
  
  const handleDeleteDestination = (id: string) => {
    setLocalSettings(prev => ({
      ...prev,
      destinations: prev.destinations.filter(d => d.id !== id)
    }));
  };
  
  const handleExport = () => {
    const dataStr = JSON.stringify({ properties, settings }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'property-analyzer-backup.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        const data = JSON.parse(result);
        if (data.properties && data.settings) {
          if (window.confirm(`確定要匯入 ${data.properties.length} 筆物件資料嗎？這將會覆蓋現有資料！`)) {
            onImport(data.properties);
            onSave(data.settings);
            alert("匯入成功！");
          }
        } else {
          alert("檔案格式錯誤。");
        }
      } catch (err) {
        alert("匯入失敗：" + err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div>
      <h2>分析與設定</h2>
      <p>調整您的偏好權重，推薦分數將會**即時自動更新**。</p>
      
      <div className="settings-grid">
        <div className="form-section">
          <h3>偏好權重 (總和 100%)</h3>
          <div className="form-group slider-group">
            <label>月負擔</label>
            <input type="range" min="0" max="100" name="cost" value={localSettings.weights.cost} onChange={handleWeightChange} />
            <span>{localSettings.weights.cost}%</span>
          </div>
          <div className="form-group slider-group">
            <label>通勤時間</label>
            <input type="range" min="0" max="100" name="commute" value={localSettings.weights.commute} onChange={handleWeightChange} />
            <span>{localSettings.weights.commute}%</span>
          </div>
          <div className="form-group slider-group">
            <label>空間坪數</label>
            <input type="range" min="0" max="100" name="size" value={localSettings.weights.size} onChange={handleWeightChange} />
            <span>{localSettings.weights.size}%</span>
          </div>
          <div className="form-group slider-group">
            <label>屋齡</label>
            <input type="range" min="0" max="100" name="age" value={localSettings.weights.age} onChange={handleWeightChange} />
            <span>{localSettings.weights.age}%</span>
          </div>
        </div>

        <div className="form-section">
          <h3>通勤分析設定</h3>
          <div className="form-group">
            <label>Google Maps API 金鑰 (本地開發用)</label>
            <input
              type="password"
              name="googleMapsApiKey"
              placeholder="貼上您的 API Key"
              value={localSettings.googleMapsApiKey}
              onChange={handleFieldChange}
            />
          </div>
          <div className="form-group">
            <label>目的地列表 (第一個為主要分析目標)</label>
            {localSettings.destinations.map(dest => (
              <div key={dest.id} className="destination-item">
                <div>
                  <strong>{dest.name}</strong>
                  <span> ({dest.address})</span>
                </div>
                <button className="btn-danger" onClick={() => handleDeleteDestination(dest.id)}>X</button>
              </div>
            ))}
            <div className="add-destination-form">
              <input
                type="text"
                placeholder="名稱 (例如: 公司)"
                value={newDestName}
                onChange={(e) => setNewDestName(e.target.value)}
              />
              <input
                type="text"
                placeholder="地址"
                value={newDestAddress}
                onChange={(e) => setNewDestAddress(e.target.value)}
              />
              <button onClick={handleAddDestination}>＋</button>
            </div>
          </div>
        </div>
        
        <div className="form-section full-width">
          <h3>資料備份 (V3.0)</h3>
          <div className="form-group">
            <label>匯出/下載目前所有資料</label>
            <button onClick={handleExport}>匯出 JSON 備份檔</button>
          </div>
           <div className="form-group">
            <label>從備份檔匯入 (將覆蓋)</label>
            <input type="file" accept=".json" onChange={handleImport} />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 子組件：物件編輯/新增 Modal (V7.0 已升級) ---
function PropertyFormModal({ property, onClose, onSave }: {
  property: Property,
  onClose: () => void,
  onSave: (p: Property) => void,
}) {
  const [form, setForm] = useState(property);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      oneTimeCosts: {
        ...prev.oneTimeCosts,
        [name]: Number(value)
      }
    }));
  };
  
  const handleListChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'tags' | 'photoUrls') => {
    const list = e.target.value.split(',').map(t => t.trim());
    setForm(prev => ({ ...prev, [field]: list }));
  };
  
  // V6.0: API 功能改為提示模式
  const handleGeocode = async () => {
    alert(`[功能限制說明]\n\n此功能 (自動定位) 需要串接 Google Maps API。\n\n由於 GitHub Pages 靜態網站的 CORS 安全限制，此功能無法在線上版運作。\n\n您可以在本機下載專案，並在 vite.config.ts 中設定 'server.proxy' 來啟用此功能進行本地測試。`);
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{property.id.startsWith('new-') ? '新增物件' : '編輯物件'}</h2>
          <button className="btn-danger" onClick={onClose}>X</button>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
          <div className="form-grid">
            <div className="form-section">
              <h3>基本資料</h3>
              <div className="form-group">
                <label>物件名稱</label>
                <input type="text" name="title" value={form.title} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>地址</label>
                <input type="text" name="address" value={form.address} onChange={handleChange} />
                <button type="button" className="btn-secondary" onClick={handleGeocode} style={{ marginTop: '0.5rem' }}>
                  自動定位 (限本機)
                </button>
              </div>
               <div className="form-group">
                <label>狀態</label>
                <select name="status" value={form.status} onChange={handleChange}>
                  {Object.entries(statusMap).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>賞屋日期</label>
                <input type="date" name="visitDate" value={form.visitDate} onChange={handleChange} />
              </div>
            </div>

            <div className="form-section">
              <h3>核心數據</h3>
              <div className="form-group">
                <label>格局</label>
                <input type="text" name="layout" value={form.layout} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>權狀 (坪)</label>
                <input type="number" step="0.1" name="areaPing" value={form.areaPing} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>屋齡 (年)</label>
                <input type="number" name="ageYears" value={form.ageYears} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>緯度 (Lat)</label>
                <input type="number" step="0.0001" name="lat" value={form.lat} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>經度 (Lon)</label>
                <input type="number" step="0.0001" name="lon" value={form.lon} onChange={handleChange} />
              </div>
            </div>

            <div className="form-section">
              <h3>財務條件</h3>
              <div className="form-group">
                <label>總價 (元)</label>
                <input type="number" name="price" value={form.price} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>頭期款 (元)</label>
                <input type="number" name="downPayment" value={form.downPayment} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>貸款年數 (年)</label>
                <input type="number" name="loanYears" value={form.loanYears} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>貸款利率 (%)</label>
                <input type="number" step="0.1" name="interestPct" value={form.interestPct} onChange={handleChange} />
              </div>
            </div>

            <div className="form-section">
              <h3>每月成本</h3>
              <div className="form-group">
                <label>管理費 (月)</label>
                <input type="number" name="monthlyFees" value={form.monthlyFees} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>通勤時間 (分)</label>
                <input type="number" name="commuteMinutes" value={form.commuteMinutes} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>通勤花費 (月)</label>
                <input type="number" name="commuteCostMonthly" value={form.commuteCostMonthly} onChange={handleChange} />
              </div>
            </div>
            
            <div className="form-section full-width">
              <h3>一次性成本</h3>
              <div className="form-grid">
               <div className="form-group">
                <label>仲介費 (元)</label>
                <input type="number" name="brokerFee" value={form.oneTimeCosts.brokerFee} onChange={handleCostChange} />
              </div>
               <div className="form-group">
                <label>契稅/代書費 (元)</label>
                <input type="number" name="deedTax" value={form.oneTimeCosts.deedTax} onChange={handleCostChange} />
              </div>
               <div className="form-group">
                <label>規費 (元)</label>
                <input type="number" name="adminFee" value={form.oneTimeCosts.adminFee} onChange={handleCostChange} />
              </div>
              <div className="form-group">
                <label>裝潢款 (元)</label>
                <input type="number" name="renovation" value={form.oneTimeCosts.renovation} onChange={handleCostChange} />
              </div>
            </div>
          </div>
            
            <div className="form-section full-width">
              <h3>雜項</h3>
              <div className="form-group">
                <label>照片連結 (用逗號分隔)</label>
                <input type="text" name="photoUrls" value={form.photoUrls.join(', ')} onChange={(e) => handleListChange(e, 'photoUrls')} />
              </div>
              <div className="form-group">
                <label>標籤 (用逗號分隔)</label>
                <input type="text" name="tags" value={form.tags.join(', ')} onChange={(e) => handleListChange(e, 'tags')} />
              </div>
              <div className="form-group">
                <label>Notes (筆記)</label>
                <textarea name="notes" value={form.notes} onChange={handleChange}></textarea>
              </div>
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn-primary">儲存</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- V6.0: "Compare Modal" 組件 ---
function CompareModal({ properties, onClose }: {
  properties: ProcessedProperty[],
  onClose: () => void
}) {
  const fields = [
    { key: 'status', name: '狀態' },
    { key: 'price', name: '總價 (元)' },
    { key: 'pricePerPing', name: '單價 (萬/坪)' },
    { key: 'totalScore', name: '綜合推薦分' },
    { key: 'scores.cost', name: '成本分數' },
    { key: 'scores.commute', name: '通勤分數' },
    { key: 'scores.size', name: '空間分數' },
    { key: 'scores.age', name: '屋齡分數' },
    { key: 'areaPing', name: '權狀 (坪)' },
    { key: 'ageYears', name: '屋齡 (年)' },
    { key: 'monthlyTotalCost', name: '總月付 (元)' },
    { key: 'commuteMinutes', name: '通勤 (分)' },
    { key: 'layout', name: '格局' },
    { key: 'visitDate', name: '賞屋日期' },
    { key: 'notes', name: '筆記' },
  ];
  
  const getValue = (obj: any, path: string) => {
    return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : 'N/A'), obj);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content compare-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>物件比較</h2>
          <button className="btn-danger" onClick={onClose}>X</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="compare-table">
            <thead>
              <tr>
                <th>功能</th>
                {properties.map(p => <th key={p.id}>{p.title}</th>)}
              </tr>
            </thead>
            <tbody>
              {fields.map(field => (
                <tr key={field.key}>
                  <td>{field.name}</td>
                  {properties.map(p => {
                    let value = getValue(p, field.key);
                    if (typeof value === 'number' && ['price', 'monthlyTotalCost'].includes(field.key)) {
                      value = `$${value.toLocaleString()}`;
                    }
                    if (field.key === 'status') {
                      value = statusMap[value as PropertyStatus] || 'N/A';
                    }
                    return <td key={p.id}>{value}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- V7.0: "Tools & Info" 組件 ---
const PIE_COLORS = ['#8884d8', '#82ca9d']; // 本金, 利息

function ToolsInfoView({ properties, settings }: {
  properties: ProcessedProperty[],
  settings: Settings
}) {
  const [calcPrice, setCalcPrice] = useState(10000000);
  const [calcYears, setCalcYears] = useState(30);
  const [calcRate, setCalcRate] = useState(2.2);
  const [calcDownPayment, setCalcDownPayment] = useState(2000000);
  const [calcBudget, setCalcBudget] = useState(30000);
  
  // What-If 模擬
  const [scenarioRate, setScenarioRate] = useState(0.5);
  const [scenarioDown, setScenarioDown] = useState(500000);

  // 攤還
  const amortizationData = useMemo(() => {
    const loanAmount = calcPrice - calcDownPayment;
    const monthlyPayment = calculateMonthlyPayment(loanAmount, calcYears, calcRate);
    const totalPayment = monthlyPayment * calcYears * 12;
    const totalInterest = totalPayment - loanAmount;
    return [
      { name: '總本金', value: loanAmount },
      { name: '總利息', value: totalInterest },
    ];
  }, [calcPrice, calcDownPayment, calcYears, calcRate]);

  // What-if
  const scenarioResults = useMemo(() => {
    return properties.map(p => {
      const newRate = p.interestPct + scenarioRate;
      const newDown = p.downPayment + scenarioDown;
      
      const newLoan_rate = p.price - p.downPayment;
      const newPayment_rate = calculateMonthlyPayment(newLoan_rate, p.loanYears, newRate);
      
      const newLoan_down = p.price - newDown;
      const newPayment_down = calculateMonthlyPayment(newLoan_down, p.loanYears, p.interestPct);

      return {
        id: p.id,
        title: p.title,
        originalPayment: p.monthlyMortgage,
        newPayment_rate,
        newPayment_down,
      }
    });
  }, [properties, scenarioRate, scenarioDown]);

  return (
    <div className="tools-page">
      <h2>分析工具 (V7.0)</h2>
      
      <div className="tools-grid">
        <div className="tool-card">
          <h3>(1) 房貸月付金 & 攤還試算</h3>
          <div className="form-group">
            <label>房屋總價</label>
            <input type="number" value={calcPrice} onChange={e => setCalcPrice(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>頭期款</label>
            <input type="number" value={calcDownPayment} onChange={e => setCalcDownPayment(Number(e.target.value))} />
          </div>
           <div className="form-group">
            <label>貸款年數 (年)</label>
            <input type="number" value={calcYears} onChange={e => setCalcYears(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>貸款利率 (%)</label>
            <input type="number" step="0.1" value={calcRate} onChange={e => setCalcRate(Number(e.target.value))} />
          </div>
          <div className="calculator-result">
            預估月付金: ${amortizationData[0].value > 0 ? calculateMonthlyPayment(amortizationData[0].value, calcYears, calcRate).toLocaleString() : 0}
          </div>
          <div className="amortization-pie-chart">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={amortizationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} fill="#8884d8" label>
                   {amortizationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <PieTooltip formatter={(value: number) => value.toLocaleString()} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="tool-card">
          <h3>(2) 可負擔房價回推</h3>
           <div className="form-group">
            <label>我的每月預算</label>
            <input type="number" value={calcBudget} onChange={e => setCalcBudget(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>貸款年數 (年)</label>
            <input type="number" value={calcYears} onChange={e => setCalcYears(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>貸款利率 (%)</label>
            <input type="number" step="0.1" value={calcRate} onChange={e => setCalcRate(Number(e.target.value))} />
          </div>
           <div className="calculator-result">
            可負擔總貸款: ${calculateMonthlyPayment(1, calcYears, calcRate) > 0 ? (Math.round(calcBudget / calculateMonthlyPayment(1, calcYears, calcRate))).toLocaleString() : 0}
          </div>
        </div>
      </div>
      
      <div className="tool-card" style={{ marginTop: '1.5rem' }}>
        <h3>(3) "What-If" 財務情境模擬</h3>
        <p>模擬當條件改變時，您所有物件的月付金變化。</p>
        <div className="tools-grid">
           <div className="form-group">
            <label>情境1: 利率調升 (%)</label>
            <input type="number" step="0.1" value={scenarioRate} onChange={e => setScenarioRate(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>情境2: 頭期款增加 (元)</label>
            <input type="number" step="100000" value={scenarioDown} onChange={e => setScenarioDown(Number(e.target.value))} />
          </div>
        </div>
        <table className="scenario-table">
          <thead>
            <tr>
              <th>物件</th>
              <th>原始月付</th>
              <th>情境1: 新月付 (利率 +{scenarioRate}%)</th>
              <th>情境2: 新月付 (頭款 +{scenarioDown.toLocaleString()})</th>
            </tr>
          </thead>
          <tbody>
            {scenarioResults.map(p => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td className="original">${p.originalPayment.toLocaleString()}</td>
                <td className="new">${p.newPayment_rate.toLocaleString()}</td>
                <td className="new">${p.newPayment_down.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
    </div>
  );
}


// --- V4.0: "About" 頁面組件 ---
function AboutView() {
  return (
    <div className="about-page">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {readmeContent}
      </ReactMarkdown>
    </div>
  );
}

export default App;