import React, { useState } from 'react';
import styles from './MyApplications.module.css';

function MyApplications() {
    const [activeTab, setActiveTab] = useState('ilanlar'); // 'ilanlar' or 'sonuclar'
    const [expandedCardId, setExpandedCardId] = useState(null);

    // Mock data for applications
    const applications = [
        { 
            id: 1, 
            title: 'Senior Frontend Developer', 
            company: 'TechNova', 
            status: 'Değerlendirmede', 
            date: '21 Ekim 2026',
            location: 'İstanbul, Türkiye',
            workType: 'Remote',
            currentStep: 2, // 1: İletildi, 2: Ön Değerleme, 3: Mülakat, 4: Sonuç
            isRejected: false
        },
        { 
            id: 2, 
            title: 'Yazılım Mühendisi', 
            company: 'Global Solutions', 
            status: 'Görüşme Bekleniyor', 
            date: '18 Ekim 2026',
            location: 'Ankara, Türkiye',
            workType: 'Hibrit',
            currentStep: 3,
            isRejected: false
        },
        { 
            id: 3, 
            title: 'UI/UX Designer', 
            company: 'Creative Studio', 
            status: 'İncelendi', 
            date: '15 Ekim 2026',
            location: 'İzmir, Türkiye',
            workType: 'Tam Zamanlı',
            currentStep: 2,
            isRejected: false
        },
    ];

    // Mock data for results
    const results = [
        { 
            id: 4, 
            title: 'Fullstack Developer', 
            company: 'DevCorp', 
            status: 'Kabul Edildi', 
            date: '10 Ekim 2026',
            location: 'Remote',
            workType: 'Tam Zamanlı',
            currentStep: 4,
            isRejected: false
        },
        { 
            id: 5, 
            title: 'Frontend Developer', 
            company: 'WebAgency', 
            status: 'Olumsuz', 
            date: '05 Ekim 2026',
            location: 'İstanbul, Türkiye',
            workType: 'Tam Zamanlı',
            currentStep: 3, // Reddedildiği aşama (örneğin mülakattan sonra)
            isRejected: true,
            rejectionReason: 'Sahip olduğunuz yetkinlikler bu pozisyon için oldukça değerli olmakla birlikte, bu ilan özelinde aradığımız ileri seviye React Native tecrübesinin eksik olması sebebiyle başvurunuzu olumsuz olarak değerlendirmek durumunda kaldık. Kariyer yolculuğunuzda başarılar dileriz.'
        },
    ];

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
                        {applications.length > 0 ? applications.map(renderCard) : (
                            <p className={styles.emptyState}>Henüz hiçbir ilana başvurmadınız.</p>
                        )}
                    </div>
                )}

                {activeTab === 'sonuclar' && (
                    <div className={styles.listWrapper}>
                        {results.length > 0 ? results.map(renderCard) : (
                            <p className={styles.emptyState}>Sonuçlanmış bir başvurunuz bulunmuyor.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MyApplications;
