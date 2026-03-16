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

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const [jobCandidates, setJobCandidates] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);

    const openJobModal = async (job) => {
        setSelectedJob(job);
        setIsModalOpen(true);
        setModalLoading(true);
        
        try {
            const token = localStorage.getItem('jwToken');
            const response = await axios.get(`https://localhost:9001/api/v1/Applications/pool`, {
                params: {
                    JobPostingId: job.id,
                    PageNumber: 1,
                    PageSize: 100,
                    SortBy: 'nlpscoredesc'
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data && response.data.data) {
                setJobCandidates(response.data.data);
            } else {
                setJobCandidates([]);
            }
        } catch (err) {
            console.error("Error fetching job candidates:", err);
            setJobCandidates([]);
        } finally {
            setModalLoading(false);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedJob(null);
        setJobCandidates([]);
    };

    const handleToggleStatus = async (id, makeActive) => {
        try {
            const token = localStorage.getItem('jwToken');
            await axios.put(`https://localhost:9001/api/v1/JobPostings/${id}/status`, {
                id: id,
                isActive: makeActive
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Optimistically update local state instead of doing a full refetch
            setJobs(prevJobs => prevJobs.map(j => 
                j.id === id ? { ...j, status: makeActive ? 'Active' : 'Closed' } : j
            ));
            
            if (selectedJob && selectedJob.id === id) {
                setSelectedJob(prev => ({ ...prev, status: makeActive ? 'Active' : 'Closed' }));
            }
            alert(`İlan başarıyla ${makeActive ? 'aktif edildi' : 'pasife alındı'}.`);
        } catch (err) {
            console.error(err);
            alert('Durum güncellenirken bir hata oluştu.');
        }
    };

    const handleDeleteJob = () => {
        // Backend developer is writing the delete logic on the server, so we just show an alert here as planned
        if(window.confirm("Bu ilanı sistemden tamamen kaldırmak istediğinize emin misiniz?")) {
            alert("Delete işlemi planlandığı üzere şimdilik arayüzde simüle ediliyor. API ayağa kalktığında bu bölüm çalışacaktır.");
        }
    };

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
                                            {job.status === 'Active' && !job.isDraft ? 'Aktif' : job.status === 'Closed' ? 'Pasif' : 'Taslak'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={styles.actionLink} onClick={() => openJobModal(job)}>İlanı İncele</span>
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

            {/* Job Details Modal */}
            {isModalOpen && selectedJob && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <div style={modalHeaderStyle}>
                            <h2 style={{ margin: 0 }}>İlan Detayları: {selectedJob.jobTitle}</h2>
                            <button onClick={closeModal} style={closeBtnStyle}>X</button>
                        </div>
                        <div style={modalBodyStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 5px 0' }}>{selectedJob.department} - {selectedJob.location}</h3>
                                    <p style={{ margin: 0, color: '#666' }}>ID: #{selectedJob.id?.substring(0, 8).toUpperCase()}</p>
                                    <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>
                                        Mevcut Durum: {selectedJob.status === 'Active' ? <span style={{color: 'green'}}>Aktif</span> : <span style={{color: 'orange'}}>{selectedJob.status}</span>}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button 
                                        onClick={() => handleToggleStatus(selectedJob.id, selectedJob.status !== 'Active')}
                                        style={{ ...actionBtnStyle, backgroundColor: selectedJob.status === 'Active' ? '#f39c12' : '#2ecc71' }}
                                    >
                                        {selectedJob.status === 'Active' ? '⏸ Pasife Al' : '▶️ Aktif Et'}
                                    </button>
                                    <button onClick={handleDeleteJob} style={{ ...actionBtnStyle, backgroundColor: '#e74c3c' }}>
                                        🗑️ İlanı Sil
                                    </button>
                                </div>
                            </div>
                            
                            <hr style={{ borderColor: '#eee', margin: '20px 0' }} />
                            
                            <h3 style={{marginBottom: '10px'}}>Bu İlana Başvuran Adaylar</h3>
                            {modalLoading ? (
                                <p style={{textAlign: 'center', color: '#666'}}>Adaylar yükleniyor...</p>
                            ) : jobCandidates.length === 0 ? (
                                <p style={{textAlign: 'center', color: '#666'}}>Bu ilana henüz başvuru yapılmamış.</p>
                            ) : (
                                <table className={styles.table} style={{marginTop: '0'}}>
                                    <thead>
                                        <tr>
                                            <th>ADAY</th>
                                            <th>DENEYİM & EĞİTİM</th>
                                            <th>NLP SKORU</th>
                                            <th>AKSİYON</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {jobCandidates.map(cand => (
                                            <tr key={cand.applicationId}>
                                                <td>
                                                    <strong>{cand.firstName} {cand.lastName}</strong><br/>
                                                    <span style={{fontSize: '12px', color: '#666'}}>{cand.email || 'Email yok'}</span>
                                                </td>
                                                <td>{cand.experienceYears !== null ? `${cand.experienceYears} Yıl` : '-'} / {cand.educationLevel || '-'}</td>
                                                <td>
                                                    <span style={{fontWeight: 'bold', color: cand.nlpMatchScore >= 75 ? '#20B2AA' : '#f39c12'}}>
                                                        %{cand.nlpMatchScore}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={styles.actionLink} onClick={() => navigate('/company/candidates')}>Havuzda Gör</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Inline Styles for Modal
const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};
const modalContentStyle = {
    backgroundColor: '#fff', borderRadius: '12px', width: '800px', maxWidth: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
};
const modalHeaderStyle = {
    padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
};
const closeBtnStyle = {
    background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999'
};
const modalBodyStyle = {
    padding: '20px', overflowY: 'auto'
};
const actionBtnStyle = {
    border: 'none', padding: '10px 15px', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
};

export default CompanyJobs;
