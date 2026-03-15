import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './CompanyJobs.module.css';

function CompanyJobs() {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Search, Filter and Pagination States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

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
        return `#${id.substring(0, 8).toUpperCase()}`;
    };

    // Calculate dynamic stats from ALL fetched jobs
    const totalApps = jobs.reduce((sum, job) => sum + (job.totalApplications || 0), 0);
    const activeCount = jobs.filter(j => j.status === 'Active').length;
    const totalHighMatch = jobs.reduce((sum, job) => sum + (job.nlpHighMatchCount || 0), 0);
    const pendingCount = jobs.filter(j => j.status === 'Draft' || j.isDraft).length;

    // Derived states for filtering
    const departments = ['All', ...new Set(jobs.map(j => j.department).filter(Boolean))];

    const filteredJobs = jobs.filter(job => {
        const matchesSearch = (job.jobTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (job.id || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = filterDept === 'All' || job.department === filterDept;

        // Status matching
        let matchesStatus = true;
        if (filterStatus === 'Active') matchesStatus = job.status === 'Active' && !job.isDraft;
        if (filterStatus === 'Draft') matchesStatus = job.status === 'Draft' || job.isDraft;

        return matchesSearch && matchesDept && matchesStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filteredJobs.length / ITEMS_PER_PAGE));
    const paginatedJobs = filteredJobs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterDept, filterStatus]);

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
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.purpleBg}`}>🧠</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Yüksek Eşleşme (NLP)</span>
                        <span className={styles.statValue}>{loading ? '...' : totalHighMatch}</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.greenBg}`}>📢</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Aktif İlanlar</span>
                        <span className={styles.statValue}>{loading ? '...' : activeCount}</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.orangeBg}`}>📋</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Değerlendirme Bekleyen</span>
                        <span className={styles.statValue}>{loading ? '...' : pendingCount}</span>
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className={styles.tableSection}>
                <div className={styles.tableControls}>
                    <input
                        type="text"
                        placeholder="İlan başlığı veya ID ile ara..."
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className={styles.filters}>
                        <select
                            className={styles.filterSelect}
                            value={filterDept}
                            onChange={(e) => setFilterDept(e.target.value)}
                        >
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept === 'All' ? 'Tüm Departmanlar' : dept}</option>
                            ))}
                        </select>
                        <select
                            className={styles.filterSelect}
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="All">Durum: Tümü</option>
                            <option value="Active">Aktif</option>
                            <option value="Draft">Taslak</option>
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
                            {paginatedJobs.map(job => (
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
                    <span>Toplam {filteredJobs.length} ilandan {(currentPage - 1) * ITEMS_PER_PAGE + 1} ile {Math.min(currentPage * ITEMS_PER_PAGE, filteredJobs.length)} arası gösteriliyor</span>
                    {totalPages > 1 && (
                        <div className={styles.pageButtons}>
                            <button
                                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                            >&lt;</button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                                <button
                                    key={pageNum}
                                    className={currentPage === pageNum ? styles.activePage : ''}
                                    onClick={() => handlePageChange(pageNum)}
                                >
                                    {pageNum}
                                </button>
                            ))}
                            <button
                                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                            >&gt;</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CompanyJobs;
