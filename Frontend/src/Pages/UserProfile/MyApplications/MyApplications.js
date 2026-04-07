import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './MyApplications.module.css';
function MyApplications() {
    const [activeTab, setActiveTab] = useState('ilanlar'); // 'ilanlar' or 'sonuclar'
    const [expandedCardId, setExpandedCardId] = useState(null);
    const [applications, setApplications] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    const mapStatusToStep = (status) => {
        if (!status) return 1;
        const s = status.toUpperCase();
        if (s.includes('SUBMITTED') || s.includes('İLETİLDİ')) return 1;
        if (s.includes('REVIEW') || s.includes('INCELEME') || s.includes('İNCELENİYOR')) return 2;
        if (s.includes('INTERVIEW') || s.includes('MÜLAKAT')) return 3;
        if (s.includes('ACCEPT') || s.includes('REJECT') || s.includes('OLUMLU') || s.includes('OLUMSUZ') || s.includes('KABUL')) return 4;
        return 1;
    };

    const isStatusRejected = (status) => {
        if (!status) return false;
        const s = status.toUpperCase();
        return s.includes('REJECT') || s.includes('OLUMSUZ');
    };

    const isStatusResult = (status) => {
        if (!status) return false;
        const s = status.toUpperCase();
        return s.includes('ACCEPT') || s.includes('REJECT') || s.includes('OLUMLU') || s.includes('OLUMSUZ') || s.includes('KABUL');
    };

    useEffect(() => {
        const fetchApplications = async () => {
            try {
                const token = localStorage.getItem('jwToken');
                if (!token) {
                    setLoading(false);
                    return;
                }

                // Decode token to get candidateId (nameidentifier or sub or uid)
                const payload = JSON.parse(atob(token.split('.')[1]));
                const candidateId = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.uid || payload.sub;

                if (!candidateId) {
                    setLoading(false);
                    return;
                }

                const response = await axios.get(`https://localhost:9001/api/v1/Applications/my-applications/${candidateId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (response.data) {
                    const allData = response.data.map(a => ({
                        id: a.applicationId,
                        title: a.jobTitle,
                        company: a.department, // Using department as company name placeholder since the query handler sets Department
                        status: a.applicationStatus || 'SUBMITTED',
                        date: new Date(a.appliedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
                        location: a.location,
                        workType: a.workType,
                        currentStep: mapStatusToStep(a.applicationStatus),
                        isRejected: isStatusRejected(a.applicationStatus),
                        rejectionReason: 'Başvurunuz değerlendirme sonucu olumsuz sonuçlanmıştır.'
                    }));

                    const appsList = allData.filter(a => !isStatusResult(a.status));
                    const resList = allData.filter(a => isStatusResult(a.status));

                    setApplications(appsList);
                    setResults(resList);
                }
            } catch (err) {
                console.error("Error fetching applications", err);
            } finally {
                setLoading(false);
            }
        };

        fetchApplications();
    }, []);

    const toggleCard = (id) => {
        if (expandedCardId === id) setExpandedCardId(null);
        else setExpandedCardId(id);
    };

    const renderStepper = (app) => {
        const steps = ['Başvuru İletildi', 'Ön Değerlendirme', 'Mülakat', 'Sonuç'];
        
        return (
            <div className={styles.stepperContainer}>
                <div className={styles.stepperBox}>
                    <div className={styles.stepperLineTrack}></div>
                    {steps.map((step, index) => {
                        const stepNum = index + 1;
                        let stepStatusClass = '';
                        
                        if (app.isRejected && stepNum === app.currentStep) {
                            stepStatusClass = styles.stepRejected; // Reddedildiği adım
                        } else if (app.isRejected && stepNum > app.currentStep) {
                            stepStatusClass = styles.stepPending; // Kalan adımlar girilmedi
                        } else if (stepNum < app.currentStep || (stepNum === app.currentStep && !app.isRejected)) {
                            stepStatusClass = styles.stepCompleted; // Geçilen veya mevcut olumlu adım
                        } else {
                            stepStatusClass = styles.stepPending; // Henüz gelinmeyen adım
                        }

                        return (
                            <div key={index} className={`${styles.stepItem} ${stepStatusClass}`}>
                                <div className={styles.stepCircle}>
                                    {stepStatusClass === styles.stepCompleted ? '✓' : (stepStatusClass === styles.stepRejected ? '✕' : stepNum)}
                                </div>
                                <div className={styles.stepTitle}>{step}</div>
                            </div>
                        );
                    })}
                </div>

                {app.isRejected && app.rejectionReason && (
                    <div className={styles.rejectionBox}>
                        <h4 className={styles.rejectionTitle}>Neden Reddedildim?</h4>
                        <p className={styles.rejectionText}>{app.rejectionReason}</p>
                    </div>
                )}
            </div>
        );
    };

    const renderCard = (app) => {
        const isExpanded = expandedCardId === app.id;

        return (
            <div key={app.id} className={`${styles.card} ${isExpanded ? styles.cardExpanded : ''}`} onClick={() => toggleCard(app.id)}>
                <div className={styles.cardHeader}>
                    <div className={styles.cardInfo}>
                        <h3 className={styles.jobTitle}>{app.title}</h3>
                        <p className={styles.companyName}>{app.company}</p>
                        
                        {isExpanded && (
                            <div className={styles.jobExtraInfo}>
                                <span>📍 {app.location}</span>
                                <span>💼 {app.workType}</span>
                            </div>
                        )}
                    </div>
                    
                    <div className={styles.cardMeta}>
                        <span className={styles.date}>{app.date}</span>
                        <span className={`${styles.statusBadge} 
                            ${app.isRejected ? styles.statusDanger : (app.status === 'Kabul Edildi' ? styles.statusSuccess : styles.statusPending)}`}>
                            {app.status}
                        </span>
                    </div>
                </div>

                {isExpanded && (
                    <div className={styles.cardBody} onClick={(e) => e.stopPropagation()}>
                        <hr className={styles.divider} />
                        <h4 className={styles.stepperHeader}>Süreç Detayı</h4>
                        {renderStepper(app)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={styles.applicationsContainer}>
            <div className={styles.tabsHeader}>
                <button 
                    className={`${styles.tabBtn} ${activeTab === 'ilanlar' ? styles.active : ''}`}
                    onClick={() => { setActiveTab('ilanlar'); setExpandedCardId(null); }}
                >
                    Başvurduğum İlanlar
                </button>
                <button 
                    className={`${styles.tabBtn} ${activeTab === 'sonuclar' ? styles.active : ''}`}
                    onClick={() => { setActiveTab('sonuclar'); setExpandedCardId(null); }}
                >
                    Sonuçlarım
                </button>
            </div>

            <div className={styles.tabContent}>
                {activeTab === 'ilanlar' && (
                    <div className={styles.listWrapper}>
                        {loading ? <p className={styles.emptyState}>Yükleniyor...</p> : (
                            applications.length > 0 ? applications.map(renderCard) : (
                                <p className={styles.emptyState}>Henüz hiçbir ilana başvurmadınız.</p>
                            )
                        )}
                    </div>
                )}

                {activeTab === 'sonuclar' && (
                    <div className={styles.listWrapper}>
                        {loading ? <p className={styles.emptyState}>Yükleniyor...</p> : (
                            results.length > 0 ? results.map(renderCard) : (
                                <p className={styles.emptyState}>Sonuçlanmış bir başvurunuz bulunmuyor.</p>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MyApplications;
