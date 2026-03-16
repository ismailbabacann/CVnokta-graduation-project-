import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import styles from './Insights.module.css';

// 1. Top Employer Requirements (TF-IDF weighted mock data)
const tfIdfData = [
  { requirement: 'React.js', weight: 89, category: 'Frontend' },
  { requirement: '.NET Core', weight: 85, category: 'Backend' },
  { requirement: 'SQL / PostgreSQL', weight: 78, category: 'Database' },
  { requirement: 'Microservices', weight: 72, category: 'Architecture' },
  { requirement: 'Docker & K8s', weight: 68, category: 'DevOps' },
  { requirement: 'Agile / Scrum', weight: 65, category: 'Soft Skill' },
  { requirement: 'TypeScript', weight: 62, category: 'Frontend' },
];

// 2. Rising Job Roles (6 Month Trend)
const roleTrendData = [
  { month: 'Oct', 'Frontend Dev': 400, 'Backend Dev': 300, 'DevOps': 150 },
  { month: 'Nov', 'Frontend Dev': 450, 'Backend Dev': 380, 'DevOps': 180 },
  { month: 'Dec', 'Frontend Dev': 420, 'Backend Dev': 450, 'DevOps': 220 },
  { month: 'Jan', 'Frontend Dev': 580, 'Backend Dev': 520, 'DevOps': 310 },
  { month: 'Feb', 'Frontend Dev': 610, 'Backend Dev': 590, 'DevOps': 380 },
  { month: 'Mar', 'Frontend Dev': 750, 'Backend Dev': 680, 'DevOps': 490 },
];

// 3. High Value / Rare Skills (Supply vs Demand Radar)
const rareSkillsData = [
  { subject: 'Cloud Architecture', A: 95, B: 40, fullMark: 100 },
  { subject: 'AI/ML Integration', A: 90, B: 30, fullMark: 100 },
  { subject: 'GoLang', A: 85, B: 35, fullMark: 100 },
  { subject: 'Cybersecurity', A: 80, B: 45, fullMark: 100 },
  { subject: 'Blockchain Dev', A: 70, B: 20, fullMark: 100 },
  { subject: 'Rust', A: 65, B: 15, fullMark: 100 },
];

// Custom Tooltip for TF-IDF Bar Chart
const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <p className={styles.label}>{`${label}`}</p>
        <p className={styles.intro}>{`TF-IDF Weight: ${payload[0].value}`}</p>
        <p className={styles.desc}>Calculated from 10k+ recent job postings.</p>
      </div>
    );
  }
  return null;
};

function Insights() {
  return (
    <div className={styles.container}>
      <div className={styles.headerArea}>
        <h1 className={styles.pageTitle}>Job Market Insights</h1>
        <p className={styles.pageSubtitle}>
          Discover the most demanded skills, trending roles, and high-value niches analyzed by AI.
        </p>
      </div>

      <div className={styles.gridContainer}>
        
        {/* Chart 1: Bar Chart */}
        <div className={`${styles.chartCard} ${styles.fullWidth}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.chartTitle}>Top Employer Requirements (TF-IDF Weight)</h2>
            <p className={styles.chartDesc}>Skills extracted and weighted based on frequency across recent active job postings.</p>
          </div>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={tfIdfData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                <XAxis type="number" hide />
                <YAxis dataKey="requirement" type="category" axisLine={false} tickLine={false} width={120} tick={{fill: '#4a5568', fontWeight: 500}} />
                <Tooltip content={<CustomBarTooltip />} cursor={{fill: '#f7fafc'}} />
                <Bar dataKey="weight" fill="#764ba2" radius={[0, 4, 4, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Area Chart */}
        <div className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.chartTitle}>Trending Job Positions</h2>
            <p className={styles.chartDesc}>6-month hiring volume trajectory across key tech sectors.</p>
          </div>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={roleTrendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{fill: '#718096', fontSize: 12}} />
                <YAxis tickLine={false} axisLine={false} tick={{fill: '#718096', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                  itemStyle={{fontWeight: 600}}
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '10px'}} />
                <Area type="monotone" dataKey="Frontend Dev" stackId="1" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.6} />
                <Area type="monotone" dataKey="Backend Dev" stackId="1" stroke="#764ba2" fill="#764ba2" fillOpacity={0.7} />
                <Area type="monotone" dataKey="DevOps" stackId="1" stroke="#4c1d95" fill="#4c1d95" fillOpacity={0.8} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Radar Chart */}
        <div className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.chartTitle}>Most Valuable Niche Skills</h2>
            <p className={styles.chartDesc}>Comparing Market Demand (Purple) vs Talent Supply (Gray).</p>
          </div>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={rareSkillsData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{fill: '#4a5568', fontSize: 11, fontWeight: 600}} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Market Demand" dataKey="A" stroke="#764ba2" fill="#764ba2" fillOpacity={0.5} />
                <Radar name="Available Talent" dataKey="B" stroke="#cbd5e1" fill="#cbd5e1" fillOpacity={0.5} />
                <Tooltip 
                   contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                />
                <Legend wrapperStyle={{paddingTop: '15px'}} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Insights;
