import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import styles from './Insights.module.css';

// Custom Tooltip for TF-IDF Bar Chart
const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <p className={styles.label}>{`${label}`}</p>
        <p className={styles.intro}>{`Aranma Sayısı: ${payload[0].value}`}</p>
        <p className={styles.desc}>Sistemdeki aktif iş ilanlarından elde edilmiştir.</p>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for generic usage
const GenericTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.customTooltip}>
          <p className={styles.label}>{`${label}`}</p>
          <p className={styles.intro}>{`Açılan İlan Sayısı: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

function Insights() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await axios.get('https://localhost:9001/api/v1/Statistics/top?topN=10');
        // Handle Wrapped data response common in this architecture
        const data = response.data?.data || response.data;
        setStats(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching statistics:', err);
        setError('İstatistikler yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
      return <div className={styles.loadingContainer}>İstatistikler Yükleniyor...</div>;
  }

  if (error || !stats) {
    return <div className={styles.errorContainer}>{error || 'Veri bulunamadı.'}</div>;
  }

  // Formatting dat for charts
  const skillsData = stats.topSkills?.map(s => ({
      name: s.name,
      count: s.usageCount
  })) || [];

  const positionsData = stats.topPositions?.map(s => ({
      name: s.name,
      count: s.usageCount
  })) || [];

  const locationsData = stats.topLocations?.map(s => ({
      name: s.name,
      A: s.usageCount,
      fullMark: stats.topLocations.length > 0 ? stats.topLocations[0].usageCount : 100 // Normalize max based on highest
  })) || [];

  return (
    <div className={styles.container}>
      <div className={styles.headerArea}>
        <h1 className={styles.pageTitle}>Job Market Insights</h1>
        <p className={styles.pageSubtitle}>
          Sistemdeki iş ilanlarının Yapay Zeka (AI) destekli analizleriyle en çok aranan yetenekleri, popüler pozisyonları ve lokasyon analizlerini keşfedin.
        </p>
      </div>

      <div className={styles.gridContainer}>
        
        {/* Chart 1: Bar Chart (Skills) */}
        <div className={`${styles.chartCard} ${styles.fullWidth}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.chartTitle}>En Çok Aranan Yetenekler</h2>
            <p className={styles.chartDesc}>Sistemdeki iş ilanlarından NLP ile çıkarılan ve kullanım sıklığına göre sıralanan veriler.</p>
          </div>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={skillsData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={150} tick={{fill: '#4a5568', fontWeight: 500, fontSize: 13}} />
                <Tooltip content={<CustomBarTooltip />} cursor={{fill: '#f7fafc'}} />
                <Bar dataKey="count" fill="#4cd5a0" radius={[0, 4, 4, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Area Chart (Positions) */}
        <div className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.chartTitle}>Popüler İş Pozisyonları</h2>
            <p className={styles.chartDesc}>Platformumuzda firmalar tarafından en fazla aranan ilan unvanları.</p>
          </div>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={positionsData}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{fill: '#718096', fontSize: 11}} 
                    angle={-45}
                    textAnchor="end"
                />
                <YAxis tickLine={false} axisLine={false} tick={{fill: '#718096', fontSize: 12}} />
                <Tooltip 
                  content={<GenericTooltip />}
                  cursor={{stroke: '#a78bfa', strokeWidth: 2, strokeDasharray: '3 3'}}
                />
                <Area type="monotone" dataKey="count" stroke="#6a4cd5" fill="#6a4cd5" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Radar Chart (Locations) */}
        <div className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.chartTitle}>Şehirlere Göre İlan Yoğunluğu</h2>
            <p className={styles.chartDesc}>Açılan iş ilanlarının Türkiye/Dünya lokasyonlarına göre dağılımı.</p>
          </div>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={locationsData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="name" tick={{fill: '#4a5568', fontSize: 12, fontWeight: 600}} />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                <Radar name="İlan Sayısı" dataKey="A" stroke="#f6a96f" fill="#f6a96f" fillOpacity={0.6} />
                <Tooltip 
                   contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Insights;
