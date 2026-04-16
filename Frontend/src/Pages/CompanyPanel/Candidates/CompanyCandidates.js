import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './CompanyCandidates.module.css';

function CompanyCandidates() {
    const [sortBy, setSortBy] = useState('nlpscoredesc'); // Matches backend SortBy
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterJobId, setFilterJobId] = useState('All');
    const [companyJobs, setCompanyJobs] = useState([]);

    // Stats State
    const [stats, setStats] = useState({
        totalCandidates: 0,
        newApplicationsToday: 0,
        averageNlpScore: 0
    });
    const [statsLoading, setStatsLoading] = useState(true);

    // Modal State
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Test Exam Modal State
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [testContext, setTestContext] = useState('');
    const [testLoading, setTestLoading] = useState(false);
    const [generatedTest, setGeneratedTest] = useState(null);

    // Meeting Invitation Modal State
    const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
    const [meetingData, setMeetingData] = useState({
        meetingTitle: '',
        scheduledDate: '',
        meetingLink: '',
        meetingType: 'FINAL_INTERVIEW'
    });
    const [meetingLoading, setMeetingLoading] = useState(false);

    const openModal = (cand) => {
        setSelectedCandidate(cand);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setSelectedCandidate(null);
        setIsModalOpen(false);
        setIsTestModalOpen(false);
        setIsMeetingModalOpen(false);
        setGeneratedTest(null);
        setTestContext('');
    };

    const handleGenerateTest = async () => {
        if (!testContext.trim()) {
            alert("Lütfen test bağlamını (soru detaylarını) giriniz.");
            return;
        }
        try {
            setTestLoading(true);
            const token = localStorage.getItem('jwToken');
            const res = await axios.post(`https://localhost:9001/api/v1/JobPostings/generate-exam`, {
                testContext
            }, {
                 headers: { Authorization: `Bearer ${token}` }
            });
            if(res.data) {
                setGeneratedTest(res.data);
            }
        } catch(err) {
            console.error("Test generate error:", err);
            alert("Test oluşturulurken bir hata meydana geldi.");
        } finally {
            setTestLoading(false);
        }
    };

    const handleSendMeeting = async () => {
        if (!meetingData.meetingTitle || !meetingData.scheduledDate || !meetingData.meetingLink) {
            alert("Lütfen tüm mülakat alanlarını doldurun.");
            return;
        }
        try {
            setMeetingLoading(true);
            const token = localStorage.getItem('jwToken');
            await axios.post(`https://localhost:9001/api/v1/Meetings/invite`, {
                applicationId: selectedCandidate.applicationId,
                jobPostingId: selectedCandidate.jobPostingId || "00000000-0000-0000-0000-000000000000",
                candidateId: selectedCandidate.candidateId || "00000000-0000-0000-0000-000000000000",
                meetingTitle: meetingData.meetingTitle,
                scheduledDate: new Date(meetingData.scheduledDate).toISOString(),
                meetingLink: meetingData.meetingLink,
                meetingType: meetingData.meetingType
            }, {
                 headers: { Authorization: `Bearer ${token}` }
            });
            
            alert("Mülakat başarıyla oluşturuldu kullanıcıya ve tarafınıza gönderildi.");
            setIsMeetingModalOpen(false);
        } catch(err) {
            console.error("Meeting invite error:", err);
            alert("Mülakat daveti gönderilirken bir hata oluştu.");
        } finally {
            setMeetingLoading(false);
        }
    };

    const handleRejectCand = async () => {
        if (!selectedCandidate || !selectedCandidate.applicationId) return;
        
        if (!window.confirm("Bu adayı elemek istediğinize emin misiniz? İşlem geri alınamaz.")) return;

        try {
            const token = localStorage.getItem('jwToken');
            await axios.put(`https://localhost:9001/api/v1/Applications/status/bulk`, {
                applicationIds: [selectedCandidate.applicationId],
                stage: 'REJECTED'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            alert("Aday başarıyla elendi.");
            setCandidates(prev => prev.filter(c => c.applicationId !== selectedCandidate.applicationId));
            closeModal();
        } catch(err) {
            console.error("Reject candidate error:", err);
            alert("Aday reddedilirken bir hata oluştu.");
        }
    };

    useEffect(() => {
        const fetchCandidates = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('jwToken');
                const response = await axios.get(`https://localhost:9001/api/v1/Applications/pool`, {
                    params: {
                        PageNumber: 1,
                        PageSize: 50,
                        SortBy: sortBy,
                        JobPostingId: filterJobId === 'All' ? undefined : filterJobId
                    },
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (response.data && response.data.data) {
                    setCandidates(response.data.data);
                } else {
                    setCandidates([]);
                }
                setError(null);
            } catch (err) {
                console.error('Error fetching candidates:', err);
                setError('Adaylar yüklenirken bir hata oluştu veya yetkiniz yok.');
            } finally {
                setLoading(false);
            }
        };

        fetchCandidates();
    }, [sortBy, filterJobId]);

    useEffect(() => {
        const fetchJobs = async () => {
             try {
                 const token = localStorage.getItem('jwToken');
                 const res = await axios.get('https://localhost:9001/api/v1/JobPostings/dashboard/list', {
                     headers: { Authorization: `Bearer ${token}` }
                 });
                 if (res.data && res.data.data) {
                     setCompanyJobs(res.data.data);
                 }
             } catch(err) {
                 console.error('Error fetching jobs for filter:', err);
             }
        };
        fetchJobs();
    }, []);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('jwToken');
                const res = await axios.get('https://localhost:9001/api/v1/Applications/stats/pool-summary', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data) {
                    setStats({
                        totalCandidates: res.data.totalCandidates || 0,
                        newApplicationsToday: res.data.newApplicationsToday || 0,
                        averageNlpScore: res.data.averageNlpScore || 0
                    });
                }
            } catch (err) {
                console.error('Error fetching pool stats:', err);
            } finally {
                setStatsLoading(false);
            }
        };
        fetchStats();
    }, []);

    const filteredCandidates = candidates.filter(cand => {
        const trm = searchTerm.toLowerCase();
        const fullName = `${cand.firstName} ${cand.lastName}`.toLowerCase();
        const pos = (cand.appliedPosition || '').toLowerCase();
        return fullName.includes(trm) || pos.includes(trm);
    });

    return (
        <div className={styles.container}>
            {/* Header Area */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.title}>Aday Havuzu</h1>
                    <p className={styles.subtitle}>Adaylarınızı yapay zeka uyum (NLP) skoruna göre inceleyin ve önceliklendirin.</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.blueBg}`}>👥</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Toplam Aday Havuzu</span>
                        <span className={styles.statValue}>{statsLoading ? '...' : stats.totalCandidates}</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.greenBg}`}>📅</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Bugün Gelen Başvurular</span>
                        <span className={styles.statValue}>{statsLoading ? '...' : stats.newApplicationsToday}</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.purpleBg}`}>🧠</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Ort. Yapay Zeka Uyum Skoru</span>
                        <span className={styles.statValue}>{statsLoading ? '...' : `%${stats.averageNlpScore}`}</span>
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className={styles.tableSection}>
                <div className={styles.tableControls}>
                    <input 
                        type="text" 
                        placeholder="Aday ismi veya pozisyon ara..." 
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className={styles.filters}>
                        <select
                            className={styles.filterSelect}
                            value={filterJobId}
                            onChange={(e) => setFilterJobId(e.target.value)}
                        >
                            <option value="All">Filtre: Tüm İlanlar</option>
                            {companyJobs.map(job => (
                                <option key={job.jobId || job.id} value={job.jobId || job.id}>
                                    İlan: {job.jobTitle}
                                </option>
                            ))}
                        </select>
                        <select
                            className={styles.filterSelect}
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="nlpscoredesc">Sıralama: En Yüksek NLP Skoru</option>
                            <option value="nlpscoreasc">Sıralama: En Düşük NLP Skoru</option>
                            <option value="datedesc">Sıralama: En Yeni Başvuru</option>
                        </select>
                    </div>
                </div>

                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>ADAY BİLGİSİ</th>
                            <th>BAŞVURDUĞU POZİSYON</th>
                            <th>BAŞVURU TARİHİ</th>
                            <th>YAPAY ZEKA (NLP) SKORU</th>
                            <th>AKSİYON</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>Aday havuzu yükleniyor...</td></tr>
                        )}
                        {!loading && error && (
                            <tr><td colSpan="6" style={{ textAlign: "center", padding: "20px", color: "red" }}>{error}</td></tr>
                        )}
                        {!loading && !error && filteredCandidates.length === 0 && (
                            <tr><td colSpan="6" style={{ textAlign: "center", padding: "20px", color: "#666" }}>Arama kriterlerine uyan aday bulunamadı.</td></tr>
                        )}
                        {!loading && !error && filteredCandidates.map(cand => (
                            <tr key={cand.applicationId}>
                                <td>
                                    <div className={styles.candidateInfo}>
                                        <div className={styles.avatar}>{(cand.firstName?.charAt(0) || '') + (cand.lastName?.charAt(0) || '')}</div>
                                        <div>
                                            <div className={styles.candName}>{cand.firstName} {cand.lastName}</div>
                                            <div className={styles.candId}>ID: #{cand.candidateDisplayId}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.roleText}>{cand.appliedPosition}</div>
                                </td>
                                <td>
                                    <div className={styles.dateText}>
                                        {new Date(cand.applicationDate).toLocaleDateString('tr-TR')}
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.nlpWrapper}>
                                        <span className={`${styles.nlpScoreBadge} ${cand.nlpMatchScore >= 90 ? styles.scoreHigh : cand.nlpMatchScore >= 75 ? styles.scoreMedium : styles.scoreLow}`}>
                                            %{cand.nlpMatchScore} Uyum
                                        </span>
                                        {cand.nlpMatchScore >= 90 && <span className={styles.sparkle}>✨</span>}
                                    </div>
                                </td>
                                <td>
                                    <button className={styles.actionBtn} onClick={() => openModal(cand)}>Başvuruyu İncele</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className={styles.pagination}>
                    <span>Sistemde toplam {filteredCandidates.length} aday bulunuyor</span>
                </div>
            </div>

            {/* Candidate Details Modal */}
            {isModalOpen && selectedCandidate && (
                <div style={{...modalOverlayStyle, backdropFilter: 'blur(4px)'}}>
                    <div style={{...modalContentStyle, width: '800px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)'}}>
                        {/* Header Area with Gradient */}
                        <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', padding: '30px', color: 'white', position: 'relative' }}>
                            <button onClick={closeModal} style={{...closeBtnStyle, position: 'absolute', top: '20px', right: '20px', color: 'white', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>X</button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'white', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                                    {(selectedCandidate.firstName?.charAt(0) || '') + (selectedCandidate.lastName?.charAt(0) || '')}
                                </div>
                                <div>
                                    <h2 style={{ margin: '0 0 5px 0', fontSize: '28px' }}>{selectedCandidate.firstName} {selectedCandidate.lastName}</h2>
                                    <p style={{ margin: 0, opacity: 0.9, fontSize: '15px' }}>{selectedCandidate.appliedPosition} (ID: #{selectedCandidate.candidateDisplayId})</p>
                                    <div style={{ marginTop: '10px', display: 'inline-block', padding: '4px 12px', borderRadius: '20px', background: 'rgba(255,255,255,0.2)', fontSize: '14px', fontWeight: '500' }}>
                                        {selectedCandidate.nlpMatchScore >= 75 ? '🌟 Yüksek Uyum :' : '📉 Uyum Skoru :'} %{selectedCandidate.nlpMatchScore}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Body Area with Grid Layout */}
                        <div style={{ padding: '30px', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                {/* Left Column */}
                                <div>
                                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', height: '100%' }}>
                                        <h4 style={{ color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span role="img" aria-label="contact">📱</span> İletişim Bilgileri
                                        </h4>
                                        <div style={{ color: '#334155', lineHeight: '1.8' }}>
                                            <p style={{ margin: '10px 0' }}><strong>✉️ Email:</strong> <a href={`mailto:${selectedCandidate.email}`} style={{color: '#4f46e5', textDecoration: 'none'}}>{selectedCandidate.email || 'Belirtilmemiş'}</a></p>
                                            <p style={{ margin: '10px 0' }}><strong>📞 Telefon:</strong> {selectedCandidate.phone || 'Belirtilmemiş'}</p>
                                            <p style={{ margin: '10px 0' }}>
                                                <strong>🔗 LinkedIn:</strong> {selectedCandidate.linkedInProfile ? (
                                                    <a href={selectedCandidate.linkedInProfile} target="_blank" rel="noopener noreferrer" style={{color: '#4f46e5', textDecoration: 'none'}}>Profili Görüntüle</a>
                                                ) : 'Belirtilmemiş'}
                                            </p>
                                            <p style={{ margin: '10px 0' }}><strong>📍 Konum:</strong> {selectedCandidate.location || 'Belirtilmemiş'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div>
                                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', height: '100%' }}>
                                        <h4 style={{ color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span role="img" aria-label="letter">✍️</span> Ön Yazı / Hedef
                                        </h4>
                                        <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px', minHeight: '120px', whiteSpace: 'pre-wrap', color: '#475569', fontStyle: 'italic', fontSize: '14px', lineHeight: '1.6' }}>
                                            "{selectedCandidate.coverLetter || 'Aday bu başvuru için ön yazı eklemeyi tercih etmemiş.'}"
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Pipeline Stage Timeline */}
                            {selectedCandidate.currentPipelineStage && (
                                <div style={{ marginTop: '20px', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                    <h4 style={{ color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        📊 Pipeline Durumu
                                    </h4>
                                    {(() => {
                                        const stage = selectedCandidate.currentPipelineStage;
                                        const stages = [
                                            { key: 'ENGLISH_TEST_PENDING', label: 'İngilizce Testi', icon: '🇬🇧', color: '#00b4db' },
                                            { key: 'SKILLS_TEST_PENDING',  label: 'Beceri Testi',    icon: '📝', color: '#ed8936' },
                                            { key: 'AI_INTERVIEW_PENDING', label: 'AI Mülakat',      icon: '🤖', color: '#f5576c' },
                                            { key: 'NLP_REVIEW',           label: 'CV Analizi',      icon: '🔍', color: '#667eea' },
                                            { key: 'COMPLETED',            label: 'Tamamlandı',      icon: '🎉', color: '#48bb78' },
                                        ];
                                        const order = { ENGLISH_TEST_PENDING:0, SKILLS_TEST_PENDING:1, AI_INTERVIEW_PENDING:2, NLP_REVIEW:3, COMPLETED:4, REJECTED_ENGLISH:0, REJECTED_SKILLS:1, REJECTED_AI:2, REJECTED_NLP:3 };
                                        const currentIdx = order[stage] ?? 0;
                                        const rejected   = stage?.startsWith('REJECTED_');
                                        const completed  = stage === 'COMPLETED';
                                        return (
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px' }}>
                                                    {stages.map((s, idx) => {
                                                        let bg = '#f1f5f9', textCol = '#94a3b8', borderCol = '#e2e8f0';
                                                        if (completed) { bg = s.color; textCol = '#fff'; borderCol = s.color; }
                                                        else if (rejected) {
                                                            if (idx < currentIdx) { bg = '#48bb78'; textCol = '#fff'; borderCol = '#48bb78'; }
                                                            else if (idx === currentIdx) { bg = '#e53e3e'; textCol = '#fff'; borderCol = '#e53e3e'; }
                                                        } else {
                                                            if (idx < currentIdx) { bg = '#48bb78'; textCol = '#fff'; borderCol = '#48bb78'; }
                                                            else if (idx === currentIdx) { bg = s.color + '22'; textCol = s.color; borderCol = s.color; }
                                                        }
                                                        const mark = completed ? '✓' : (rejected && idx === currentIdx) ? '✕' : (idx < currentIdx ? '✓' : s.icon);
                                                        return (
                                                            <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto', minWidth: '60px' }}>
                                                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: bg, border: `2px solid ${borderCol}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: textCol, fontWeight: '700' }}>
                                                                        {mark}
                                                                    </div>
                                                                    <div style={{ fontSize: '10px', color: idx === currentIdx ? (rejected ? '#e53e3e' : s.color) : (idx < currentIdx ? '#48bb78' : '#94a3b8'), textAlign: 'center', marginTop: '6px', fontWeight: idx === currentIdx ? '700' : '500' }}>{s.label}</div>
                                                                </div>
                                                                {idx < stages.length - 1 && (
                                                                    <div style={{ flex: 1, height: '2px', background: idx < currentIdx ? '#48bb78' : '#e2e8f0', margin: '0 2px', marginBottom: '20px' }} />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {rejected && selectedCandidate.rejectionReason && (
                                                    <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#c53030' }}>
                                                        <strong>Elenme sebebi:</strong> {selectedCandidate.rejectionReason}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
                                {selectedCandidate.cvUrl ? (
                                    <a href={selectedCandidate.cvUrl} 
                                       target="_blank" 
                                       rel="noopener noreferrer" 
                                       onClick={(e) => {
                                           if (!selectedCandidate.cvUrl.startsWith('http') && !selectedCandidate.cvUrl.startsWith('//')) {
                                               e.preventDefault();
                                               alert("Veritabanındaki CV linki geçerli bir web adresi değil (http ile başlamıyor). Bu yüzden açılamaz.\nLink: " + selectedCandidate.cvUrl);
                                           }
                                       }}
                                       style={{ ...cvBtnStyle, backgroundColor: '#cbd5e1', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        📄 CV Görüntüle
                                    </a>
                                ) : (
                                    <span style={{ color: '#94a3b8', padding: '12px', display: 'flex', alignItems: 'center' }}>CV yüklenmedi.</span>
                                )}
                                
                                <button style={{ ...cvBtnStyle, backgroundColor: '#ec4899', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setIsMeetingModalOpen(true)}>
                                    📅 Mülakat Ayarla
                                </button>
                                
                                <button style={{ ...cvBtnStyle, backgroundColor: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={handleRejectCand}>
                                    ❌ Adayı Ele (Reddet)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Test Generate Modal */}
            {isTestModalOpen && selectedCandidate && (
                <div style={{...modalOverlayStyle, zIndex: 1010}}>
                    <div style={{...modalContentStyle, width: '700px'}}>
                        <div style={modalHeaderStyle}>
                            <h2 style={{ margin: 0, color: '#4f46e5' }}>🤖 AI ile Uzmanlık Testi Üret</h2>
                            <button onClick={() => setIsTestModalOpen(false)} style={closeBtnStyle}>X</button>
                        </div>
                        <div style={modalBodyStyle}>
                            <p style={{marginBottom: '15px', color: '#666'}}>Adaya değerlendirme için göndermek istediğiniz testin bağlamını ve beklentilerinizi yazın.</p>
                            
                            <textarea 
                                value={testContext}
                                onChange={e => setTestContext(e.target.value)}
                                placeholder="Örn: Bu iş için temel İngilizce iletişim ve C# bilgisi gerekiyor, 3 soru hazırla."
                                style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '6px', border: '1px solid #c7d2fe', marginBottom: '15px', fontFamily: 'Inter, sans-serif' }}
                            />
                            
                            <button 
                                onClick={handleGenerateTest} 
                                disabled={testLoading}
                                style={{ padding: '10px 20px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '20px' }}
                            >
                                {testLoading ? 'AI Test Hazırlıyor...' : '✨ Soruları Üret'}
                            </button>

                            {generatedTest && (
                                <div style={{ backgroundColor: '#f8f9fc', padding: '20px', borderRadius: '8px', border: '1px solid #eef0f4' }}>
                                    <h3 style={{marginTop: 0, color: '#333'}}>{generatedTest.title || 'Oluşturulan Test'}</h3>
                                    <p style={{color: '#666', marginBottom: '20px'}}>{generatedTest.description}</p>
                                    
                                    {generatedTest.questions?.map((q, idx) => (
                                        <div key={idx} style={{marginBottom: '20px'}}>
                                            <div style={{fontWeight: 'bold', marginBottom: '10px'}}>Soru {idx + 1}: {q.questionText}</div>
                                            <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '10px'}}>
                                                {q.options?.map((opt, oIdx) => (
                                                    <div key={oIdx} style={{padding: '8px', backgroundColor: '#fff', borderRadius: '4px', border: opt === q.correctAnswer ? '1px solid #2ecc71' : '1px solid #ddd'}}>
                                                        {opt} {opt === q.correctAnswer && <span style={{color: '#2ecc71', fontWeight: 'bold', marginLeft: '10px'}}>✓ Doğru</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    <button 
                                        onClick={() => { alert('Test adaya başarıyla atandı!'); setIsTestModalOpen(false); }}
                                        style={{ padding: '10px 20px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%', marginTop: '10px' }}
                                    >
                                        Adaya Gönder
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Meeting Modal */}
            {isMeetingModalOpen && selectedCandidate && (
                <div style={{...modalOverlayStyle, zIndex: 1010}}>
                    <div style={{...modalContentStyle, width: '500px'}}>
                        <div style={modalHeaderStyle}>
                            <h2 style={{ margin: 0, color: '#e67e22' }}>📅 Mülakat Daveti Oluştur</h2>
                            <button onClick={() => setIsMeetingModalOpen(false)} style={closeBtnStyle}>X</button>
                        </div>
                        <div style={modalBodyStyle}>
                            <p style={{marginBottom: '20px', color: '#666'}}>Aday <strong>{selectedCandidate.firstName} {selectedCandidate.lastName}</strong> için bir görüşme planlayın.</p>
                            
                            <div style={{marginBottom: '15px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Mülakat Başlığı *</label>
                                <input 
                                    type="text" 
                                    value={meetingData.meetingTitle}
                                    onChange={e => setMeetingData({...meetingData, meetingTitle: e.target.value})}
                                    placeholder="Örn: Final Mülakatı - Backend"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                />
                            </div>

                            <div style={{marginBottom: '15px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Tarih ve Saat *</label>
                                <input 
                                    type="datetime-local" 
                                    value={meetingData.scheduledDate}
                                    onChange={e => setMeetingData({...meetingData, scheduledDate: e.target.value})}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                />
                            </div>

                            <div style={{marginBottom: '15px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Görüşme Linki (Meet / Zoom / Teams) *</label>
                                <input 
                                    type="url" 
                                    value={meetingData.meetingLink}
                                    onChange={e => setMeetingData({...meetingData, meetingLink: e.target.value})}
                                    placeholder="https://meet.google.com/..."
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                />
                            </div>

                            <div style={{marginBottom: '20px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Görüşme Tipi</label>
                                <select 
                                    value={meetingData.meetingType}
                                    onChange={e => setMeetingData({...meetingData, meetingType: e.target.value})}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                                >
                                    <option value="HR_SCREENING">İK Ön Görüşme</option>
                                    <option value="TECHNICAL_INTERVIEW">Teknik Mülakat</option>
                                    <option value="FINAL_INTERVIEW">Final Mülakatı</option>
                                </select>
                            </div>

                            <button 
                                onClick={handleSendMeeting} 
                                disabled={meetingLoading}
                                style={{ padding: '12px 20px', backgroundColor: '#e67e22', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}
                            >
                                {meetingLoading ? 'Gönderiliyor...' : 'Daveti Oluştur ve Gönder'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Basic inline styles for the modal overlay to avoid creating a new CSS file simply for a quick popup
const modalOverlayStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
};

const modalContentStyle = {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '600px',
    maxWidth: '90%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
};

const modalHeaderStyle = {
    padding: '20px',
    borderBottom: '1px solid #eee',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
};

const closeBtnStyle = {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#999'
};

const modalBodyStyle = {
    padding: '20px',
    overflowY: 'auto'
};

const cvBtnStyle = {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: '#007BFF',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    transition: 'background-color 0.2s'
};

export default CompanyCandidates;
