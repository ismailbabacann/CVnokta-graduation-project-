import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CompanyJobs.module.css';

function CompanyJobs() {
    const navigate = useNavigate();

    const jobs = [
        { id: '#SEC-2024-001', title: 'Security Engineer - IAM', dept: 'Tech Security', loc: 'İstanbul / Maslak (Hibrit)', apps: 600, interviewed: 12, nlpScore: 85, nlpCount: 26, status: 'Aktif' },
        { id: '#FE-2024-042', title: 'Senior Frontend Developer', dept: 'Engineering', loc: 'Remote', apps: '1000+', interviewed: 5, nlpScore: 90, nlpCount: 8, status: 'Aktif' },
        { id: '#PM-2024-015', title: 'Product Manager - Mobile', dept: 'Product', loc: 'İstanbul / Maslak', apps: 324, interviewed: 18, nlpScore: 80, nlpCount: 42, status: 'Beklemede' },
        { id: '#HR-2024-008', title: 'HR Specialist', dept: 'People & Culture', loc: 'Ankara / Ofis', apps: 85, interviewed: 4, nlpScore: 0, nlpCount: 0, status: 'Taslak' },
    ];

    return (
        <div className={styles.container}>
            {/* Header Area */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.title}>Aktif İş İlanları</h1>
                    <p className={styles.subtitle}>Aday başvurularını yönetin ve yapay zeka destekli eşleşmeleri inceleyin.</p>
                </div>
                <button className={styles.createBtn} onClick={() => navigate('/company/create-job')}>
                    + Yeni İlan Oluştur
                </button>
            </div>

            {/* Stats Cards */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.blueBg}`}>👥</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Toplam Başvuru</span>
                        <span className={styles.statValue}>1,284</span>
                    </div>
                    <div className={styles.cardFooter}>Tümünü gör</div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.purpleBg}`}>🧠</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Yüksek Eşleşme (NLP)</span>
                        <span className={styles.statValue}>142</span>
                    </div>
                    <div className={styles.cardFooter}>Analizleri gör</div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.greenBg}`}>📢</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Aktif İlanlar</span>
                        <span className={styles.statValue}>8</span>
                    </div>
                    <div className={styles.cardFooter}>Yönet</div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.orangeBg}`}>📋</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Değerlendirme Bekleyen</span>
                        <span className={styles.statValue}>36</span>
                    </div>
                    <div className={styles.cardFooter}>İşlem yap</div>
                </div>
            </div>

            {/* Table Area */}
            <div className={styles.tableSection}>
                <div className={styles.tableControls}>
                    <input type="text" placeholder="İlan başlığı veya ID ile ara..." className={styles.searchInput} />
                    <div className={styles.filters}>
                        <select className={styles.filterSelect}>
                            <option>Tüm Departmanlar</option>
                        </select>
                        <select className={styles.filterSelect}>
                            <option>Durum: Tümü</option>
                        </select>
                    </div>
                </div>

                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>POZİSYON BAŞLIĞI</th>
                            <th>DEPARTMAN & KONUM</th>
                            <th>ADAY İSTATİSTİKLERİ</th>
                            <th>NLP SKORU</th>
                            <th>DURUM</th>
                            <th>İNCELENDİ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobs.map(job => (
                            <tr key={job.id}>
                                <td>
                                    <div className={styles.jobTitle}>{job.title}</div>
                                    <div className={styles.jobId}>ID: {job.id}</div>
                                </td>
                                <td>
                                    <div className={styles.dept}>{job.dept}</div>
                                    <div className={styles.loc}>{job.loc}</div>
                                </td>
                                <td>
                                    <div className={styles.statsCol}>
                                        <div className={styles.statGroup}><strong>{job.apps}</strong><span>Başvuru</span></div>
                                        <div className={styles.statGroup}><strong className={styles.blueText}>{job.interviewed}</strong><span>Mülakat</span></div>
                                    </div>
                                </td>
                                <td>
                                    {job.status === 'Taslak' ? (
                                        <span className={styles.calcText}>Hesaplanıyor...</span>
                                    ) : (
                                        <div className={styles.nlpWrapper}>
                                            <span className={styles.nlpText}>%{job.nlpScore} Üstü: {job.nlpCount} Aday</span>
                                            <div className={styles.progressBar}>
                                                <div className={styles.progressFill} style={{ width: `${job.nlpScore}%` }}></div>
                                            </div>
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <span className={`${styles.statusBadge} ${styles[job.status === 'Aktif' ? 'active' : job.status === 'Beklemede' ? 'pending' : 'draft']}`}>
                                        {job.status}
                                    </span>
                                </td>
                                <td>
                                    <span className={styles.actionLink}>{job.status === 'Taslak' ? 'Düzenle' : 'Detay'}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className={styles.pagination}>
                    <span>Toplam 24 ilandan 1 ile 4 arası gösteriliyor</span>
                    <div className={styles.pageButtons}>
                        <button>&lt;</button>
                        <button className={styles.activePage}>1</button>
                        <button>2</button>
                        <button>3</button>
                        <button>&gt;</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CompanyJobs;
