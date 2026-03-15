import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './CompanyJobs.module.css';

function CompanyJobs() {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const token = localStorage.getItem('jwToken');
                if (!token) {
                    setError('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
                    setLoading(false);
                    return;
                }

                // Call the dashboard job list api
                // Assuming it returns an array in response.data.data
                const response = await axios.get('https://localhost:9001/api/v1/JobPostings/dashboard/list', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                // Set the jobs using response data depending on the wrapper structure
                if (response.data && response.data.data) {
                    setJobs(response.data.data);
                } else if (Array.isArray(response.data)) {
                    setJobs(response.data);
                } else {
                    setJobs([]); // Fallback
                }

                setError(null);
            } catch (err) {
                console.error('Error fetching company jobs:', err);
                if (err.response && err.response.status === 401) {
                    setError("Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.");
                } else {
                    setError("İlanlar yüklenirken bir hata oluştu.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchJobs();
    }, []);

    // Format ID for display
    const formatDisplayId = (id) => {
        if (!id) return '';
        // E.g., take the first 8 chars of Guid
        return `#${id.substring(0, 8).toUpperCase()}`;
    };

    // Calculate dynamic stats
    const totalApps = jobs.reduce((sum, job) => sum + (job.totalApplications || 0), 0);
    const activeCount = jobs.filter(j => j.status === 'Active').length;
    // Just mock placeholders for NLP and Interviwed since they might not be fully fleshed out
    const totalHighMatch = jobs.reduce((sum, job) => sum + (job.nlpHighMatchCount || 0), 0);
    const pendingCount = jobs.filter(j => j.status === 'Draft' || j.isDraft).length;

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
                        <span className={styles.statValue}>{loading ? '...' : totalApps}</span>
                    </div>
                    <div className={styles.cardFooter}>Tümünü gör</div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.purpleBg}`}>🧠</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Yüksek Eşleşme (NLP)</span>
                        <span className={styles.statValue}>{loading ? '...' : totalHighMatch}</span>
                    </div>
                    <div className={styles.cardFooter}>Analizleri gör</div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.greenBg}`}>📢</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Aktif İlanlar</span>
                        <span className={styles.statValue}>{loading ? '...' : activeCount}</span>
                    </div>
                    <div className={styles.cardFooter}>Yönet</div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.orangeBg}`}>📋</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Değerlendirme Bekleyen</span>
                        <span className={styles.statValue}>{loading ? '...' : pendingCount}</span>
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

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>İlanlar yükleniyor...</div>
                ) : error ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>{error}</div>
                ) : jobs.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>Henüz ilan oluşturmadınız.</div>
                ) : (
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
                                        <div className={styles.jobTitle}>{job.jobTitle}</div>
                                        <div className={styles.jobId}>ID: {formatDisplayId(job.id)}</div>
                                    </td>
                                    <td>
                                        <div className={styles.dept}>{job.department}</div>
                                        <div className={styles.loc}>{job.location}</div>
                                    </td>
                                    <td>
                                        <div className={styles.statsCol}>
                                            <div className={styles.statGroup}><strong>{job.totalApplications || 0}</strong><span>Başvuru</span></div>
                                            <div className={styles.statGroup}><strong className={styles.blueText}>{job.totalInterviewed || 0}</strong><span>Mülakat</span></div>
                                        </div>
                                    </td>
                                    <td>
                                        {job.isDraft || job.status === 'Draft' ? (
                                            <span className={styles.calcText}>Hesaplanmıyor (Taslak)</span>
                                        ) : (
                                            <div className={styles.nlpWrapper}>
                                                <span className={styles.nlpText}>%70 Üstü: {job.nlpHighMatchCount || 0} Aday</span>
                                                <div className={styles.progressBar}>
                                                    {/* Fake percentage visual representation based on candidates for now */}
                                                    <div className={styles.progressFill} style={{ width: `${Math.min(100, (job.nlpHighMatchCount || 0) * 10)}%` }}></div>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${styles[job.status === 'Active' ? 'active' : job.status === 'Draft' ? 'draft' : 'pending']}`}>
                                            {job.status === 'Active' && !job.isDraft ? 'Aktif' : 'Taslak'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={styles.actionLink}>{job.status === 'Draft' || job.isDraft ? 'Düzenle' : 'Adayları Gör'}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <div className={styles.pagination}>
                    <span>Toplam {jobs.length} ilandan 1 ile {jobs.length} arası gösteriliyor</span>
                    {jobs.length > 0 && (
                        <div className={styles.pageButtons}>
                            <button>&lt;</button>
                            <button className={styles.activePage}>1</button>
                            <button>&gt;</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CompanyJobs;
