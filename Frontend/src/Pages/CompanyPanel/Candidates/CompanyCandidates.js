import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './CompanyCandidates.module.css';

function CompanyCandidates() {
    const [sortBy, setSortBy] = useState('nlpscoredesc'); // Matches backend SortBy
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal State
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openModal = (cand) => {
        setSelectedCandidate(cand);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setSelectedCandidate(null);
        setIsModalOpen(false);
    };

    const handleReject = () => {
        alert("Aday başarıyla elendi!");
        closeModal();
    };

    const handleInvite = () => {
        alert("Adaya mülakat linki başarıyla gönderildi!");
        closeModal();
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
                        SortBy: sortBy
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
    }, [sortBy]);

    return (
        <div className={styles.container}>
            {/* Header Area */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.title}>Aday Havuzu</h1>
                    <p className={styles.subtitle}>Adaylarınızı yapay zeka uyum (NLP) skoruna göre inceleyin ve önceliklendirin.</p>
                </div>
            </div>

            {/* Table Area */}
            <div className={styles.tableSection}>
                <div className={styles.tableControls}>
                    <input type="text" placeholder="Aday ismi veya pozisyon ara..." className={styles.searchInput} />
                    <div className={styles.filters}>
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
                            <th>DENEYİM & EĞİTİM</th>
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
                        {!loading && !error && candidates.length === 0 && (
                            <tr><td colSpan="6" style={{ textAlign: "center", padding: "20px", color: "#666" }}>Henüz hiçbir ilanınıza başvuru yapılmamış.</td></tr>
                        )}
                        {!loading && !error && candidates.map(cand => (
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
                                    <div className={styles.expEduText}>
                                        <span className={styles.tag}>{cand.experienceYears !== null ? `${cand.experienceYears} Yıl` : 'Bilinmiyor'}</span>
                                        <span className={styles.tag}>{cand.educationLevel || 'Bilinmiyor'}</span>
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
                    <span>Sistemde toplam {candidates.length} aday bulunuyor</span>
                </div>
            </div>

            {/* Candidate Details Modal */}
            {isModalOpen && selectedCandidate && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <div style={modalHeaderStyle}>
                            <h2 style={{ margin: 0 }}>Aday Detayları</h2>
                            <button onClick={closeModal} style={closeBtnStyle}>X</button>
                        </div>
                        <div style={modalBodyStyle}>
                            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                                <div className={styles.avatar} style={{ width: '60px', height: '60px', fontSize: '24px' }}>
                                    {(selectedCandidate.firstName?.charAt(0) || '') + (selectedCandidate.lastName?.charAt(0) || '')}
                                </div>
                                <div>
                                    <h3 style={{ margin: '0 0 5px 0' }}>{selectedCandidate.firstName} {selectedCandidate.lastName}</h3>
                                    <p style={{ margin: 0, color: '#666' }}>{selectedCandidate.appliedPosition} (ID: #{selectedCandidate.candidateDisplayId})</p>
                                    <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', color: selectedCandidate.nlpMatchScore >= 75 ? '#20B2AA' : '#f39c12' }}>
                                        🌟 NLP Uyum Skoru: %{selectedCandidate.nlpMatchScore}
                                    </p>
                                </div>
                            </div>

                            <hr style={{ borderColor: '#eee', margin: '20px 0' }} />

                            <h4>İletişim Bilgileri</h4>
                            <p><strong>Email:</strong> {selectedCandidate.email || 'Belirtilmemiş'}</p>
                            <p><strong>Telefon:</strong> {selectedCandidate.phone || 'Belirtilmemiş'}</p>
                            <p>
                                <strong>LinkedIn:</strong> {selectedCandidate.linkedInProfile ? (
                                    <a href={selectedCandidate.linkedInProfile} target="_blank" rel="noopener noreferrer">Görüntüle</a>
                                ) : 'Belirtilmemiş'}
                            </p>

                            <hr style={{ borderColor: '#eee', margin: '20px 0' }} />

                            <h4>Deneyim ve Eğitim</h4>
                            <p><strong>Deneyim Yılı:</strong> {selectedCandidate.experienceYears !== null ? `${selectedCandidate.experienceYears} Yıl` : 'Belirtilmemiş'}</p>
                            <p><strong>Öğrenim Durumu:</strong> {selectedCandidate.educationLevel || 'Belirtilmemiş'}</p>

                            <hr style={{ borderColor: '#eee', margin: '20px 0' }} />

                            <h4>Ön Yazı</h4>
                            <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', minHeight: '80px', whiteSpace: 'pre-wrap' }}>
                                {selectedCandidate.coverLetter || 'Aday ön yazı eklemedi.'}
                            </div>

                            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
                                <button onClick={handleReject} style={{ ...cvBtnStyle, backgroundColor: '#e74c3c' }}>
                                    ❌ Adayı Ele
                                </button>
                                {selectedCandidate.cvUrl ? (
                                    <a href={selectedCandidate.cvUrl} target="_blank" rel="noopener noreferrer" style={{ ...cvBtnStyle, backgroundColor: '#3498db' }}>
                                        📄 CV'yi İncele
                                    </a>
                                ) : (
                                    <span style={{ color: '#999', padding: '12px', display: 'flex', alignItems: 'center' }}>CV yüklenmedi.</span>
                                )}
                                <button onClick={handleInvite} style={{ ...cvBtnStyle, backgroundColor: '#2ecc71' }}>
                                    ✅ Mülakat Linki Gönder
                                </button>
                            </div>
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
