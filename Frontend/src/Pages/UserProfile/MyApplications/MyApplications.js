import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './MyApplications.module.css';

// ── Pipeline stage config ────────────────────────────────────────────────────
const PIPELINE_STAGES = [
    { key: 'NLP_REVIEW',           label: 'CV Analysis',      icon: '🔍' },
    { key: 'ENGLISH_TEST_PENDING', label: 'English Test',     icon: '🇬🇧' },
    { key: 'SKILLS_TEST_PENDING',  label: 'Skills Test',      icon: '📝' },
    { key: 'AI_INTERVIEW_PENDING', label: 'AI Interview',     icon: '🤖' },
    { key: 'COMPLETED',            label: 'Completed',        icon: '🎉' },
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
    REJECTED_MANUAL:       0,  // Manual rejection by HR
};

const STAGE_MESSAGES = {
    ENGLISH_TEST_PENDING:  { text: '📧 English assessment test information has been sent to your e-mail.', color: '#00b4db' },
    SKILLS_TEST_PENDING:   { text: '📧 Skills test has been sent to your e-mail. Please complete the test.', color: '#ed8936' },
    AI_INTERVIEW_PENDING:  { text: '🤖 You have moved to the AI Interview stage! Your interview link has been sent to your e-mail or you can access it by clicking the button below.', color: '#f5576c' },
    NLP_REVIEW:            { text: 'Your application is under CV analysis and expert review.', color: '#667eea' },
    COMPLETED:             { text: '🎉 Congratulations! You have successfully completed all stages. Necessary evaluations are being made.', color: '#48bb78' },
    REJECTED_ENGLISH:      { text: 'Your evaluation concluded at the English test stage.', color: '#e53e3e' },
    REJECTED_SKILLS:       { text: 'Your evaluation concluded at the general skills test stage.', color: '#e53e3e' },
    REJECTED_AI:           { text: 'Your evaluation concluded at the AI interview stage.', color: '#e53e3e' },
    REJECTED_NLP:          { text: 'Your evaluation concluded at the CV analysis stage.', color: '#e53e3e' },
    REJECTED_MANUAL:       { text: 'Your evaluation has been completed by the HR team. Thank you for your application.', color: '#e53e3e' },
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
    const msgInfo     = STAGE_MESSAGES[stage] || { text: 'Your application is being processed.', color: '#667eea' };

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
                        <strong>Detail:</strong> {rejectionReason}
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
                    `${process.env.REACT_APP_API_BASE_URL}/api/v1/Applications/my-applications/${candidateId}`,
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
                        interviewToken: a.interviewToken,
                        interviewUrl: a.interviewToken
                            ? `/interview/${a.interviewToken}`
                            : null,
                        // AI Interview feedback
                        aiInterviewStrengths:  a.aiInterviewStrengths,
                        aiInterviewWeaknesses: a.aiInterviewWeaknesses,
                        aiInterviewSummary:    a.aiInterviewSummary,
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
        let badgeLabel = 'Under Review';
        if (rejected)       { badgeClass = styles.statusDanger;  badgeLabel = 'Eliminated'; }
        else if (completed) { badgeClass = styles.statusSuccess; badgeLabel = 'Completed'; }
        else if (app.stage === 'ENGLISH_TEST_PENDING')  { badgeLabel = 'English Test'; }
        else if (app.stage === 'SKILLS_TEST_PENDING')   { badgeLabel = 'Skills Test'; }
        else if (app.stage === 'AI_INTERVIEW_PENDING')  { badgeLabel = 'AI Interview'; }
        else if (app.stage === 'NLP_REVIEW')            { badgeLabel = 'CV Analysis'; }

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
                        <h4 className={styles.stepperHeader}>Process Details</h4>
                        <PipelineStepper stage={app.stage} rejectionReason={app.rejectionReason} />
                        {app.stage === 'AI_INTERVIEW_PENDING' && app.interviewToken && (
                            <div style={{ marginTop: '16px', textAlign: 'center' }}>
                                <a
                                    href={`/interview/${app.interviewToken}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.interviewBtn}
                                    onClick={e => e.stopPropagation()}
                                >
                                    🤖 Go to AI Interview
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
                                    📝 Start Exam
                                </a>
                            </div>
                        )}

                        {/* ── AI Interview Feedback (visible for COMPLETED / REJECTED_AI) ── */}
                        {(completed || app.stage === 'REJECTED_AI') && (app.aiInterviewStrengths || app.aiInterviewWeaknesses || app.aiInterviewSummary) && (
                            <div style={{ marginTop: 16 }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#1e293b' }}>🤖 AI Interview Evaluation</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    {app.aiInterviewStrengths && (
                                        <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 14, border: '1px solid #bbf7d0' }}>
                                            <div style={{ fontWeight: 700, color: '#166534', fontSize: 12, marginBottom: 6 }}>💪 Your Strengths</div>
                                            <p style={{ margin: 0, color: '#15803d', fontSize: 13, lineHeight: 1.6 }}>{app.aiInterviewStrengths}</p>
                                        </div>
                                    )}
                                    {app.aiInterviewWeaknesses && (
                                        <div style={{ background: '#fff1f2', borderRadius: 10, padding: 14, border: '1px solid #fecdd3' }}>
                                            <div style={{ fontWeight: 700, color: '#9f1239', fontSize: 12, marginBottom: 6 }}>🔻 Areas for Development</div>
                                            <p style={{ margin: 0, color: '#be123c', fontSize: 13, lineHeight: 1.6 }}>{app.aiInterviewWeaknesses}</p>
                                        </div>
                                    )}
                                </div>
                                {app.aiInterviewSummary && (
                                    <div style={{ marginTop: 10, background: '#f8fafc', borderRadius: 10, padding: 14, border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontWeight: 700, color: '#475569', fontSize: 12, marginBottom: 6 }}>📋 General Evaluation</div>
                                        <p style={{ margin: 0, color: '#334155', fontSize: 13, lineHeight: 1.6 }}>{app.aiInterviewSummary}</p>
                                    </div>
                                )}
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
                    My Applications
                </button>
                <button className={`${styles.tabBtn} ${activeTab === 'sonuclar' ? styles.active : ''}`}
                    onClick={() => { setActiveTab('sonuclar'); setExpandedCardId(null); }}>
                    My Results
                </button>
            </div>

            <div className={styles.tabContent}>
                {activeTab === 'ilanlar' && (
                    <div className={styles.listWrapper}>
                        {loading ? <p className={styles.emptyState}>Loading...</p> : (
                            applications.length > 0
                                ? applications.map(renderCard)
                                : <p className={styles.emptyState}>You haven't applied to any jobs yet.</p>
                        )}
                    </div>
                )}
                {activeTab === 'sonuclar' && (
                    <div className={styles.listWrapper}>
                        {loading ? <p className={styles.emptyState}>Loading...</p> : (
                            results.length > 0
                                ? results.map(renderCard)
                                : <p className={styles.emptyState}>You have no concluded applications.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MyApplications;
