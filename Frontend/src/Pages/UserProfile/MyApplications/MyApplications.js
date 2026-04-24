import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './MyApplications.module.css';

// ── Pipeline stage config ────────────────────────────────────────────────────
const PIPELINE_STAGES = [
    { key: 'NLP_REVIEW',           label: 'CV Analizi',       icon: '🔍' },
    { key: 'ENGLISH_TEST_PENDING', label: 'İngilizce Testi',  icon: '🇬🇧' },
    { key: 'SKILLS_TEST_PENDING',  label: 'Beceri Testi',     icon: '📝' },
    { key: 'AI_INTERVIEW_PENDING', label: 'AI Mülakat',       icon: '🤖' },
    { key: 'COMPLETED',            label: 'Tamamlandı',       icon: '🎉' },
];

const STAGE_ORDER = {
    NLP_REVIEW:            0,
    ENGLISH_TEST_PENDING:  1,
    SKILLS_TEST_PENDING:   2,
    AI_INTERVIEW_PENDING:  3,
    COMPLETED:             4,
    REJECTED_NLP:          0,
    REJECTED_ENGLISH:      1,
    REJECTED_SKILLS:       2,
    REJECTED_AI:           3,
    REJECTED_MANUAL:       0,  // HR tarafından manuel eleme
};

const STAGE_MESSAGES = {
    ENGLISH_TEST_PENDING:  { text: '📧 İngilizce değerlendirme sınavı bilgileriniz e-postanıza gönderilmiştir.', color: '#00b4db' },
    SKILLS_TEST_PENDING:   { text: '📧 Beceri testi e-postanıza gönderildi. Sınavı tamamlayın.', color: '#ed8936' },
    AI_INTERVIEW_PENDING:  { text: '🤖 AI Mülakat aşamasına geçtiniz! Mülakat linkiniz e-postanıza gönderildi veya aşağıdaki butona tıklayarak erişebilirsiniz.', color: '#f5576c' },
    NLP_REVIEW:            { text: 'Başvurunuz CV analizi ve uzman incelemesinde.', color: '#667eea' },
    COMPLETED:             { text: '🎉 Tebrikler! Tüm aşamaları başarıyla tamamladınız. Gerekli değerlendirmeler yapılmaktadır.', color: '#48bb78' },
    REJECTED_ENGLISH:      { text: 'İngilizce testi aşamasında değerlendirmeniz sonuçlandı.', color: '#e53e3e' },
    REJECTED_SKILLS:       { text: 'Genel beceri testi aşamasında değerlendirmeniz sonuçlandı.', color: '#e53e3e' },
    REJECTED_AI:           { text: 'AI mülakat aşamasında değerlendirmeniz sonuçlandı.', color: '#e53e3e' },
    REJECTED_NLP:          { text: 'CV analiz aşamasında değerlendirmeniz sonuçlandı.', color: '#e53e3e' },
    REJECTED_MANUAL:       { text: 'İK ekibi tarafından değerlendirmeniz tamamlandı. Başvurunuz için teşekkür ederiz.', color: '#e53e3e' },
};

function isRejected(stage) {
    return stage && stage.startsWith('REJECTED_');
}

function isResult(stage) {
    return stage === 'COMPLETED' || isRejected(stage);
}

function PipelineStepper({ stage, rejectionReason }) {
    const currentIdx  = STAGE_ORDER[stage] ?? 0;
    const rejected    = isRejected(stage);
    const completed   = stage === 'COMPLETED';
    const msgInfo     = STAGE_MESSAGES[stage] || { text: 'Başvurunuz işleme alındı.', color: '#667eea' };

    return (
        <div className={styles.pipelineWrapper}>
            {/* Steps */}
            <div className={styles.pipelineSteps}>
                {PIPELINE_STAGES.map((s, idx) => {
                    let stateClass = styles.stepPending;
                    if (completed) {
                        stateClass = styles.stepCompleted;
                    } else if (rejected) {
                        if (idx < currentIdx)       stateClass = styles.stepCompleted;
                        else if (idx === currentIdx) stateClass = styles.stepRejected;
                        else                         stateClass = styles.stepPending;
                    } else {
                        if (idx < currentIdx)        stateClass = styles.stepCompleted;
                        else if (idx === currentIdx) stateClass = styles.stepActive;
                        else                         stateClass = styles.stepPending;
                    }

                    const mark = completed
                        ? '✓'
                        : (rejected && idx === currentIdx)
                            ? '✕'
                            : (idx < currentIdx ? '✓' : s.icon);

                    return (
                        <React.Fragment key={s.key}>
                            <div className={`${styles.pipelineStep} ${stateClass}`}>
                                <div className={styles.stepCircle}>{mark}</div>
                                <div className={styles.stepLabel}>{s.label}</div>
                            </div>
                            {idx < PIPELINE_STAGES.length - 1 && (
                                <div className={`${styles.stepConnector} ${idx < currentIdx ? styles.connectorDone : ''}`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Status message */}
            <div className={styles.stageMessage} style={{ borderLeftColor: msgInfo.color, background: `${msgInfo.color}10` }}>
                <p style={{ color: msgInfo.color }}>{msgInfo.text}</p>
                {rejected && rejectionReason && (
                    <p className={styles.rejectionDetail}>
                        <strong>Detay:</strong> {rejectionReason}
                    </p>
                )}
            </div>
        </div>
    );
}

function MyApplications() {
    const [activeTab, setActiveTab] = useState('ilanlar');
    const [expandedCardId, setExpandedCardId] = useState(null);
    const [applications, setApplications] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchApplications = async () => {
            try {
                const token = localStorage.getItem('jwToken');
                if (!token) { setLoading(false); return; }

                const payload = JSON.parse(atob(token.split('.')[1]));
                const candidateId = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.uid || payload.sub;
                if (!candidateId) { setLoading(false); return; }

                const response = await axios.get(
                    `https://localhost:9001/api/v1/Applications/my-applications/${candidateId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                if (response.data) {
                    const allData = response.data.map(a => ({
                        id:            a.applicationId,
                        title:         a.jobTitle,
                        company:       a.department,
                        date:          new Date(a.appliedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
                        location:      a.location,
                        workType:      a.workType,
                        stage:         a.currentPipelineStage || 'NLP_REVIEW',
                        rejectionReason: a.rejectionReason,
                        activeExamToken: a.activeExamToken,
                        interviewUrl:  a.currentPipelineStage === 'AI_INTERVIEW_PENDING'
                            ? `/interview/${a.applicationId}`
                            : null,
                    }));

                    setApplications(allData.filter(a => !isResult(a.stage)));
                    setResults(allData.filter(a => isResult(a.stage)));
                }
            } catch (err) {
                console.error('Error fetching applications', err);
            } finally {
                setLoading(false);
            }
        };
        fetchApplications();
    }, []);

    const toggleCard = (id) => setExpandedCardId(prev => prev === id ? null : id);

    const renderCard = (app) => {
        const isExpanded = expandedCardId === app.id;
        const rejected   = isRejected(app.stage);
        const completed  = app.stage === 'COMPLETED';

        let badgeClass = styles.statusPending;
        let badgeLabel = 'İnceleniyor';
        if (rejected)       { badgeClass = styles.statusDanger;  badgeLabel = 'Elendin'; }
        else if (completed) { badgeClass = styles.statusSuccess; badgeLabel = 'Tamamlandı'; }
        else if (app.stage === 'ENGLISH_TEST_PENDING')  { badgeLabel = 'İngilizce Testi'; }
        else if (app.stage === 'SKILLS_TEST_PENDING')   { badgeLabel = 'Beceri Testi'; }
        else if (app.stage === 'AI_INTERVIEW_PENDING')  { badgeLabel = 'AI Mülakat'; }
        else if (app.stage === 'NLP_REVIEW')            { badgeLabel = 'CV Analizi'; }

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
                        <span className={`${styles.statusBadge} ${badgeClass}`}>{badgeLabel}</span>
                    </div>
                </div>

                {isExpanded && (
                    <div className={styles.cardBody} onClick={e => e.stopPropagation()}>
                        <hr className={styles.divider} />
                        <h4 className={styles.stepperHeader}>Süreç Detayı</h4>
                        <PipelineStepper stage={app.stage} rejectionReason={app.rejectionReason} />
                        {app.stage === 'AI_INTERVIEW_PENDING' && (
                            <div style={{ marginTop: '16px', textAlign: 'center' }}>
                                <a
                                    href={app.interviewUrl || `/interview/${app.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.interviewBtn}
                                    onClick={e => e.stopPropagation()}
                                >
                                    🤖 AI Mülakata Git
                                </a>
                            </div>
                        )}
                        {(app.stage === 'ENGLISH_TEST_PENDING' || app.stage === 'SKILLS_TEST_PENDING') && app.activeExamToken && (
                            <div style={{ marginTop: '16px', textAlign: 'center' }}>
                                <a
                                    href={`/exam/take/${app.activeExamToken}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.interviewBtn}
                                    style={{ background: 'linear-gradient(135deg, #00b4db, #0083b0)' }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    📝 Sınava Başla
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={styles.applicationsContainer}>
            <div className={styles.tabsHeader}>
                <button className={`${styles.tabBtn} ${activeTab === 'ilanlar' ? styles.active : ''}`}
                    onClick={() => { setActiveTab('ilanlar'); setExpandedCardId(null); }}>
                    Başvurduğum İlanlar
                </button>
                <button className={`${styles.tabBtn} ${activeTab === 'sonuclar' ? styles.active : ''}`}
                    onClick={() => { setActiveTab('sonuclar'); setExpandedCardId(null); }}>
                    Sonuçlarım
                </button>
            </div>

            <div className={styles.tabContent}>
                {activeTab === 'ilanlar' && (
                    <div className={styles.listWrapper}>
                        {loading ? <p className={styles.emptyState}>Yükleniyor...</p> : (
                            applications.length > 0
                                ? applications.map(renderCard)
                                : <p className={styles.emptyState}>Henüz hiçbir ilana başvurmadınız.</p>
                        )}
                    </div>
                )}
                {activeTab === 'sonuclar' && (
                    <div className={styles.listWrapper}>
                        {loading ? <p className={styles.emptyState}>Yükleniyor...</p> : (
                            results.length > 0
                                ? results.map(renderCard)
                                : <p className={styles.emptyState}>Sonuçlanmış bir başvurunuz bulunmuyor.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MyApplications;
