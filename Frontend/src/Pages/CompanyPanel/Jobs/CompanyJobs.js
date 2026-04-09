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
    
    // Modal Bulk Action States
    const [candSearchTerm, setCandSearchTerm] = useState('');
    const [selectedCandIds, setSelectedCandIds] = useState([]);
    const [isTestPromptOpen, setIsTestPromptOpen] = useState(false);
    const [testContext, setTestContext] = useState('');
    const [testType, setTestType] = useState('AI Özel Test');
    const [bulkLoading, setBulkLoading] = useState(false);

    const openJobModal = async (job) => {
        setSelectedJob(job);
        setIsModalOpen(true);
        setModalLoading(true);
        
        try {
            const token = localStorage.getItem('jwToken');
            const response = await axios.get(`https://localhost:9001/api/v1/Applications/pool`, {
                params: {
                    JobPostingId: job.jobId || job.id,
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
        setCandSearchTerm('');
        setSelectedCandIds([]);
        setIsTestPromptOpen(false);
        setTestContext('');
    };

    const toggleCandidateSelection = (id) => {
        setSelectedCandIds(prev => prev.includes(id) ? prev.filter(candId => candId !== id) : [...prev, id]);
    };

    const handleSelectAll = (filteredCands) => {
        if (selectedCandIds.length === filteredCands.length) {
            setSelectedCandIds([]); // deselect all
        } else {
            setSelectedCandIds(filteredCands.map(c => c.applicationId));
        }
    };

    const handleBulkStatusUpdate = async (newStatus) => {
        if (selectedCandIds.length === 0) {
            alert("Lütfen işlem yapmak için en az bir aday seçiniz.");
            return;
        }
        try {
            setBulkLoading(true);
            const token = localStorage.getItem('jwToken');
            await axios.post(`https://localhost:9001/api/v1/Applications/bulk-status-update`, {
                applicationIds: selectedCandIds,
                newStatus: newStatus
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Seçili adayların durumu başarıyla güncellendi.");
            // Reset selection
            setSelectedCandIds([]);
        } catch (err) {
            console.error("Toplu işlem hatası:", err);
            alert("Toplu işlem veritabanına işlenirken bir hata oluştu.");
        } finally {
            setBulkLoading(false);
        }
    };

    const handleBulkGenerateTest = async () => {
        if (selectedCandIds.length === 0) {
            alert("Lütfen test göndermek için en az bir aday seçiniz.");
            return;
        }
        if (testType === 'AI Özel Test' && !testContext.trim()) {
            alert("Lütfen test bağlamını textarea içerisine yazın.");
            return;
        }

        try {
            setBulkLoading(true);
            const token = localStorage.getItem('jwToken');
            
            let assignedContext = testContext;
            if (testType === 'Genel Yetenek Testi') assignedContext = 'Adayların analitik sorgulama ve problem çözme becerilerini ölçen sorular.';
            else if (testType === 'İngilizce Testi') assignedContext = 'Adayların iş ingilizcesi bilgilerini ölçen çoktan seçmeli sorular.';

            const testPayload = {
                candidateApplicationIds: selectedCandIds,
                context: assignedContext
            };
            await axios.post(`https://localhost:9001/api/v1/JobPostings/generate-exam`, testPayload, {
                 headers: { Authorization: `Bearer ${token}` }
            });
            
            alert(`${selectedCandIds.length} adaya otomatik sınav maili gönderildi ve bağlam atandı.`);
            setIsTestPromptOpen(false);
            setTestContext('');
            setTestType('AI Özel Test');
            setSelectedCandIds([]);
        } catch (err) {
            console.error("Toplu test gönderme hatası:", err);
            alert("Sınav oluşturulurken veya atanırken hata oluştu.");
        } finally {
            setBulkLoading(false);
        }
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
                (j.jobId || j.id) === id ? { ...j, status: makeActive ? 'Active' : 'Closed' } : j
            ));
            
            if (selectedJob && (selectedJob.jobId || selectedJob.id) === id) {
                setSelectedJob(prev => ({ ...prev, status: makeActive ? 'Active' : 'Closed' }));
            }
            alert(`İlan başarıyla ${makeActive ? 'aktif edildi' : 'pasife alındı'}.`);
        } catch (err) {
            console.error(err);
            alert('Durum güncellenirken bir hata oluştu.');
        }
    };

    const handleDeleteJob = async () => {
        if(window.confirm("Bu ilanı sistemden kaldırmak istediğinize emin misiniz?")) {
            try {
                const token = localStorage.getItem('jwToken');
                const jobId = selectedJob.jobId || selectedJob.id;
                await axios.delete(`https://localhost:9001/api/v1/JobPostings/${jobId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                // Optimistically remove from list
                setJobs(prevJobs => prevJobs.filter(j => (j.jobId || j.id) !== jobId));
                closeModal();
                alert("İlan başarıyla silindi.");
            } catch (err) {
                console.error("Delete error:", err);
                alert("İlan silinirken bir hata oluştu.");
            }
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
    const formatDisplayId = (job) => {
        if (!job) return '';
        if (job.displayId) return job.displayId;
        return `#${(job.jobId || job.id || '').substring(0, 8).toUpperCase()}`;
    };

    // Calculate dynamic stats from ALL fetched jobs
    const totalApps = jobs.reduce((sum, job) => sum + (job.totalApplications || 0), 0);
    const activeCount = jobs.filter(j => j.status === 'Active').length;
    const totalHighMatch = jobs.reduce((sum, job) => sum + (job.nlpHighMatchCount || 0), 0);

    // Derived states for filtering
    const departments = ['All', ...new Set(jobs.map(j => j.department).filter(Boolean))];

    const filteredJobs = jobs.filter(job => {
        const matchesSearch = (job.jobTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (job.displayId || job.jobId || '').toLowerCase().includes(searchTerm.toLowerCase());
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
                                <tr key={job.jobId || job.id}>
                                    <td>
                                        <div className={styles.jobTitle}>{job.jobTitle}</div>
                                        <div className={styles.jobId}>ID: {formatDisplayId(job)}</div>
                                    </td>
                                    <td>
                                        <div className={styles.dept}>{job.department}</div>
                                        <div className={styles.loc}>{job.location}</div>
                                    </td>
                                    <td>
                                        <div className={styles.statsCol}>
                                            <div className={styles.statGroup}><strong>{job.totalApplications || 0}</strong><span>Başvuru</span></div>
                                        </div>
                                    </td>
                                    <td>
                                        {job.isDraft || job.status === 'Draft' ? (
                                            <span className={styles.calcText}>-</span>
                                        ) : (
                                            <div className={styles.nlpWrapper}>
                                                <span className={styles.nlpText}>{job.nlpScoreSummary || ''}</span>
                                                {job.nlpScorePercentage ? (
                                                    <div className={styles.progressBar}>
                                                        <div className={styles.progressFill} style={{ width: `${job.nlpScorePercentage}%` }}></div>
                                                    </div>
                                                ) : null}
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
                                    <p style={{ margin: 0, color: '#666' }}>ID: {formatDisplayId(selectedJob)}</p>
                                    <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>
                                        Mevcut Durum: {selectedJob.status === 'Active' ? <span style={{color: 'green'}}>Aktif</span> : <span style={{color: 'orange'}}>{selectedJob.status}</span>}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button 
                                        onClick={() => handleToggleStatus(selectedJob.jobId || selectedJob.id, selectedJob.status !== 'Active')}
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
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                                        <input 
                                            type="text" 
                                            placeholder="Aday Ara..." 
                                            value={candSearchTerm}
                                            onChange={(e) => setCandSearchTerm(e.target.value)}
                                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', width: '250px' }}
                                        />
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button 
                                                onClick={() => setIsTestPromptOpen(true)} 
                                                style={{...actionBtnStyle, backgroundColor: '#9b59b6'}}
                                                disabled={selectedCandIds.length === 0}
                                            >
                                                📝 Adaylara Test Ata ({selectedCandIds.length})
                                            </button>
                                        </div>
                                    </div>

                                    {isTestPromptOpen && (
                                        <div style={{...modalOverlayStyle, zIndex: 1050, backdropFilter: 'blur(4px)'}}>
                                            <div style={{...modalContentStyle, width: '600px', borderRadius: '12px', overflow: 'hidden'}}>
                                                <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', padding: '20px', color: 'white' }}>
                                                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>🤖 Sınav / Test Seçimi</h3>
                                                </div>
                                                <div style={{ padding: '25px', backgroundColor: '#f8fafc' }}>
                                                    <p style={{ marginBottom: '15px', color: '#475569' }}>
                                                        Seçilen <strong>{selectedCandIds.length} aday</strong> için atanacak test tipini belirleyin. Standart testler veya AI destekli özel bağlam oluşturabilirsiniz.
                                                    </p>
                                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#334155' }}>Sınav Türü Seçin:</label>
                                                    <select 
                                                        value={testType} 
                                                        onChange={(e) => setTestType(e.target.value)} 
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}
                                                    >
                                                        <option value="Genel Yetenek Testi">Genel Yetenek Testi</option>
                                                        <option value="İngilizce Testi">İngilizce Testi</option>
                                                        <option value="AI Özel Test">🤖 AI İle Özel Test Oluştur</option>
                                                    </select>

                                                    {testType === 'AI Özel Test' && (
                                                        <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                                                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#334155' }}>Bağlam ve Sorularınız:</label>
                                                            <textarea 
                                                                value={testContext}
                                                                onChange={e => setTestContext(e.target.value)}
                                                                placeholder="AI'ın baz alacağı mülakat bağlamını veya spesifik soruları buraya yazın..."
                                                                style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '10px', resize: 'vertical' }}
                                                            />
                                                        </div>
                                                    )}

                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                                                        <button onClick={() => setIsTestPromptOpen(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', cursor: 'pointer', fontWeight: 'bold' }}>İptal</button>
                                                        <button onClick={handleBulkGenerateTest} disabled={bulkLoading} style={{ padding: '10px 20px', backgroundColor: '#8b5cf6', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {bulkLoading ? 'Gönderiliyor...' : '🚀 Testleri Gönder'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <table className={styles.table} style={{marginTop: '0'}}>
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px' }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={jobCandidates.filter(c => (c.firstName + ' ' + c.lastName).toLowerCase().includes(candSearchTerm.toLowerCase())).length > 0 && selectedCandIds.length === jobCandidates.filter(c => (c.firstName + ' ' + c.lastName).toLowerCase().includes(candSearchTerm.toLowerCase())).length}
                                                        onChange={() => handleSelectAll(jobCandidates.filter(c => (c.firstName + ' ' + c.lastName).toLowerCase().includes(candSearchTerm.toLowerCase())))}
                                                    />
                                                </th>
                                                <th>ADAY</th>
                                                <th>NLP SKORU</th>
                                                <th>AKSİYON</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {jobCandidates.filter(c => (c.firstName + ' ' + c.lastName).toLowerCase().includes(candSearchTerm.toLowerCase())).map(cand => (
                                                <tr key={cand.applicationId}>
                                                    <td>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedCandIds.includes(cand.applicationId)}
                                                            onChange={() => toggleCandidateSelection(cand.applicationId)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <strong>{cand.firstName} {cand.lastName}</strong><br/>
                                                        <span style={{fontSize: '12px', color: '#666'}}>{cand.email || 'Email yok'}</span>
                                                    </td>
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
                                </div>
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
