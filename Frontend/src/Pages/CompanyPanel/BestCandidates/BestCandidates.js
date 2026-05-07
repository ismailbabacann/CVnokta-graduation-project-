import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './BestCandidates.module.css';

// ─── Small Helpers ────────────────────────────────────────────────────────────

const ScoreBadge = ({ score }) => {
    if (score === null || score === undefined) return <span className={styles.scorePending}>Pending</span>;
    const num = Number(score);
    const cls = num >= 70 ? styles.scoreHigh : num >= 50 ? styles.scoreMid : styles.scoreLow;
    return <span className={`${styles.scoreBadge} ${cls}`}>{num.toFixed(1)}</span>;
};

const ScoreBar = ({ score, label, icon }) => {
    const num = score !== null && score !== undefined ? Number(score) : null;
    const color = num === null ? '#e2e8f0' : num >= 70 ? '#10b981' : num >= 50 ? '#f59e0b' : '#ef4444';
    return (
        <div className={styles.scoreBarWrap}>
            <div className={styles.scoreBarMeta}>
                <span className={styles.scoreBarLabel}>{icon} {label}</span>
                <span className={styles.scoreBarValue} style={{ color }}>{num !== null ? `${num.toFixed(1)}` : '—'}</span>
            </div>
            <div className={styles.scoreBarTrack}>
                <div className={styles.scoreBarFill} style={{ width: `${num ?? 0}%`, background: color }} />
            </div>
        </div>
    );
};

// ─── Full Detail Modal ────────────────────────────────────────────────────────

function CandidateDetailModal({ candidate, onClose }) {
    const [scorecard, setScorecard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Meeting state
    const [isMeetingOpen, setIsMeetingOpen] = useState(false);
    const [meetingData, setMeetingData] = useState({ meetingTitle: '', scheduledDate: '', meetingLink: '', meetingType: 'FINAL_INTERVIEW' });
    const [meetingLoading, setMeetingLoading] = useState(false);

    // Reject state
    const [rejectLoading, setRejectLoading] = useState(false);

    useEffect(() => {
        if (!candidate?.applicationId) { setLoading(false); return; }
        const fetch = async () => {
            try {
                const token = localStorage.getItem('jwToken');
                const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/v1/Evaluations/scorecard/${candidate.applicationId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setScorecard(res.data);
            } catch (e) {
                console.error('Scorecard fetch error:', e);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [candidate]);

    const handleSendMeeting = async () => {
        if (!meetingData.meetingTitle || !meetingData.scheduledDate || !meetingData.meetingLink) {
            alert('Lütfen tüm mülakat alanlarını doldurun.');
            return;
        }
        try {
            setMeetingLoading(true);
            const token = localStorage.getItem('jwToken');
            await axios.post(process.env.REACT_APP_API_BASE_URL + '/api/v1/Meetings/invite', {
                applicationId: candidate.applicationId,
                jobPostingId: candidate.jobPostingId || '00000000-0000-0000-0000-000000000000',
                candidateId: candidate.candidateId || '00000000-0000-0000-0000-000000000000',
                meetingTitle: meetingData.meetingTitle,
                scheduledDate: new Date(meetingData.scheduledDate).toISOString(),
                meetingLink: meetingData.meetingLink,
                meetingType: meetingData.meetingType
            }, { headers: { Authorization: `Bearer ${token}` } });
            alert('Mülakat daveti başarıyla oluşturuldu ve adaya gönderildi.');
            setIsMeetingOpen(false);
        } catch (e) {
            alert('Mülakat daveti gönderilirken bir hata oluştu.');
        } finally {
            setMeetingLoading(false);
        }
    };

    const handleReject = async () => {
        if (!window.confirm('Bu adayı reddetmek istediğinize emin misiniz?')) return;
        try {
            setRejectLoading(true);
            const token = localStorage.getItem('jwToken');
            await axios.post(process.env.REACT_APP_API_BASE_URL + '/api/v1/Applications/bulk-status-update', {
                applicationIds: [candidate.applicationId],
                newStatus: 'Rejected'
            }, { headers: { Authorization: `Bearer ${token}` } });
            alert('Aday başarıyla reddedildi ve bildirim e-postası gönderildi.');
            onClose();
        } catch (e) {
            alert('Red işlemi sırasında bir hata oluştu.');
        } finally {
            setRejectLoading(false);
        }
    };

    if (!candidate) return null;

    const cvScore    = scorecard?.cvAnalysisResult?.analysisScore    ?? candidate.cvAnalysisScore;
    const skillScore = scorecard?.generalTestResult?.score           ?? candidate.skillsTestScore;
    const engScore   = scorecard?.englishTestScore                   ?? candidate.englishTestScore;
    const aiScore    = scorecard?.aiInterviewSummary?.overallInterviewScore ?? candidate.aiInterviewScore;
    const finalScore = scorecard?.finalEvaluationScore?.weightedFinalScore  ?? candidate.finalWeightedScore;

    const pipelineStages = [
        { key: 'NLP_REVIEW',           label: 'CV Analizi',       color: '#667eea' },
        { key: 'ENGLISH_TEST_PENDING', label: 'İngilizce Testi',  color: '#00b4db' },
        { key: 'SKILLS_TEST_PENDING',  label: 'Beceri Testi',     color: '#ed8936' },
        { key: 'AI_INTERVIEW_PENDING', label: 'AI Mülakat',       color: '#f5576c' },
        { key: 'COMPLETED',            label: 'Tamamlandı',      color: '#48bb78' },
    ];
    const stageOrder = { NLP_REVIEW: 0, ENGLISH_TEST_PENDING: 1, SKILLS_TEST_PENDING: 2, AI_INTERVIEW_PENDING: 3, COMPLETED: 4 };
    const currentStage = candidate.currentPipelineStage || 'NLP_REVIEW';
    const currentIdx   = stageOrder[currentStage] ?? 0;
    const isRejected   = currentStage?.startsWith('REJECTED_');
    const isCompleted  = currentStage === 'COMPLETED';

    const TABS = [
        { id: 'overview',   label: 'Genel Bakış' },
        { id: 'cvanalysis', label: 'CV Analizi' },
        { id: 'feedback',   label: 'AI Değerlendirme' },
        { id: 'contact',    label: 'İletişim & CV' },
        { id: 'pipeline',   label: 'Süreç Durumu' },
    ];

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(6px)' }}
             onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: '20px', width: '860px', maxWidth: '95vw', maxHeight: '93vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.3)' }}
                 onClick={e => e.stopPropagation()}>

                {/* ── Gradient Header ─────────────────────────── */}
                <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '28px 32px', color: '#fff', position: 'relative', flexShrink: 0 }}>
                    <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        {/* Avatar */}
                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', border: '3px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                            {(candidate.candidateFullName || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h2 style={{ margin: '0 0 4px 0', fontSize: 24, fontWeight: 800 }}>{candidate.candidateFullName || 'Aday'}</h2>
                            <p style={{ margin: 0, opacity: 0.85, fontSize: 14 }}>{candidate.email || '—'}</p>
                            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>#{candidate.rankPosition} Sıralama</span>
                                {isRejected && <span style={{ background: '#e53e3e', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>✕ Reddedildi</span>}
                                {isCompleted && <span style={{ background: '#48bb78', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>✓ Tamamlandı</span>}
                            </div>
                        </div>
                        {/* Final Score Circle */}
                        {finalScore !== null && finalScore !== undefined && (
                            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: 80, height: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,0.5)', flexShrink: 0 }}>
                                <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{Number(finalScore).toFixed(1)}</span>
                                <span style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>Final</span>
                            </div>
                        )}
                    </div>

                    {/* Score pills row */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
                        {[
                            { label: 'NLP CV',    val: cvScore,    color: '#667eea' },
                            { label: 'Beceri',    val: skillScore, color: '#ed8936' },
                            { label: 'İngilizce',  val: engScore,   color: '#00b4db' },
                            { label: 'AI Mülakat', val: aiScore, color: '#f5576c' },
                        ].map(({ label, val, color }) => (
                            <div key={label} style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 10, padding: '6px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 70 }}>
                                <span style={{ fontSize: 16, fontWeight: 800 }}>{val !== null && val !== undefined ? Number(val).toFixed(0) : '—'}</span>
                                <span style={{ fontSize: 10, opacity: 0.8 }}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Tab Navigation ─────────────────────────── */}
                <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', overflowX: 'auto', flexShrink: 0 }}>
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            style={{ padding: '13px 18px', border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 600,
                                color: activeTab === tab.id ? '#764ba2' : '#64748b',
                                borderBottom: activeTab === tab.id ? '3px solid #764ba2' : '3px solid transparent' }}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── Tab Body ────────────────────────────────── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
                            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                            <p>Detaylar yükleniyor...</p>
                        </div>
                    ) : (
                        <>
                            {/* ═══ TAB: Overview ═══ */}
                            {activeTab === 'overview' && (
                                <div>
                                    <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px' }}>Puan Özeti</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
                                        {[
                                            { label: 'CV Analizi', val: cvScore, color: '#667eea' },
                                            { label: 'Beceri Testi', val: skillScore, color: '#ed8936' },
                                            { label: 'İngilizce Testi', val: engScore, color: '#00b4db' },
                                            { label: 'AI Mülakat', val: aiScore, color: '#f5576c' },
                                            { label: 'Final Puanı', val: finalScore, color: '#764ba2' },
                                        ].map(({ label, val, color }) => (
                                            <div key={label} style={{ background: '#fafafa', borderRadius: 10, padding: '14px 16px', borderLeft: `3px solid ${color}`, border: `1px solid #f0f0f0`, borderLeftWidth: 3, borderLeftColor: color }}>
                                                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{label}</div>
                                                <div style={{ fontSize: 24, fontWeight: 800, color }}>
                                                    {val !== null && val !== undefined ? Number(val).toFixed(1) : <span style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 500 }}>Bekliyor</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* HR Feedback from CV stage */}
                                    {(() => {
                                        const cvFb = scorecard?.stageFeedbacks?.find(f => f.stageType === 'CV_ANALYSIS')?.hrFeedback;
                                        if (!cvFb || (!cvFb.strengths?.length && !cvFb.weaknesses?.length && !cvFb.overall)) return null;
                                        return (
                                            <div style={{ marginTop: 4 }}>
                                                <h3 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px' }}>İK Geri Bildirimi</h3>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                                                    {cvFb.strengths?.length > 0 && (
                                                        <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '14px', border: '1px solid #bbf7d0' }}>
                                                            <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Güçlü Yönler</div>
                                                            <ul style={{ margin: 0, paddingLeft: 16 }}>{cvFb.strengths.map((s, i) => <li key={i} style={{ color: '#166534', fontSize: 13, lineHeight: 1.6 }}>{s}</li>)}</ul>
                                                        </div>
                                                    )}
                                                    {cvFb.weaknesses?.length > 0 && (
                                                        <div style={{ background: '#fff1f2', borderRadius: 10, padding: '14px', border: '1px solid #fecdd3' }}>
                                                            <div style={{ fontSize: 11, color: '#be123c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Gelişim Alanları</div>
                                                            <ul style={{ margin: 0, paddingLeft: 16 }}>{cvFb.weaknesses.map((s, i) => <li key={i} style={{ color: '#9f1239', fontSize: 13, lineHeight: 1.6 }}>{s}</li>)}</ul>
                                                        </div>
                                                    )}
                                                </div>
                                                {cvFb.overall && <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', border: '1px solid #e2e8f0', color: '#475569', fontSize: 13, lineHeight: 1.6 }}>{cvFb.overall}</div>}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* ═══ TAB: CV Analizi ═══ */}
                            {activeTab === 'cvanalysis' && (
                                <div>
                                    <h3 style={{ margin: '0 0 20px 0', color: '#1e293b', fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px' }}>CV Analizi Detayları</h3>


                                    {/* Matched Skills */}
                                    {scorecard?.cvAnalysisResult?.matchedSkills?.length > 0 && (
                                        <div style={{ marginBottom: 16 }}>
                                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Eşleşen Beceriler</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {scorecard.cvAnalysisResult.matchedSkills.map((s, i) => (
                                                    <span key={i} style={{ background: '#d1fae5', color: '#065f46', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{s}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Missing Skills */}
                                    {scorecard?.cvAnalysisResult?.missingSkills?.length > 0 && (
                                        <div style={{ marginBottom: 20 }}>
                                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Eksik Beceriler</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {scorecard.cvAnalysisResult.missingSkills.map((s, i) => (
                                                    <span key={i} style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{s}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* CV Summary */}
                                    {scorecard?.cvAnalysisResult?.summary && (
                                        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '16px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>CV Analizi Özeti</div>
                                            <p style={{ margin: 0, color: '#334155', fontSize: 13, lineHeight: 1.7 }}>{scorecard.cvAnalysisResult.summary}</p>
                                        </div>
                                    )}

                                    {!scorecard?.cvAnalysisResult && (
                                        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                                            <p>CV analizi henüz tamamlanmadı.</p>
                                        </div>
                                    )}
                                </div>
                            )}


                            {/* ═══ TAB: AI Feedback ═══ */}
                            {activeTab === 'feedback' && (
                                <div>
                                    {scorecard?.aiInterviewSummary ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                                <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '16px', border: '1px solid #bbf7d0' }}>
                                                    <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Güçlü Yönler</div>
                                                    <p style={{ margin: 0, color: '#15803d', fontSize: 13, lineHeight: 1.7 }}>{scorecard.aiInterviewSummary.strengths || '—'}</p>
                                                </div>
                                                <div style={{ background: '#fff1f2', borderRadius: 12, padding: '16px', border: '1px solid #fecdd3' }}>
                                                    <div style={{ fontSize: 11, color: '#be123c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Gelişim Alanları</div>
                                                    <p style={{ margin: 0, color: '#be123c', fontSize: 13, lineHeight: 1.7 }}>{scorecard.aiInterviewSummary.weaknesses || '—'}</p>
                                                </div>
                                            </div>

                                            {scorecard.aiInterviewSummary.overallFeedback && (
                                                <div style={{ background: '#faf5ff', borderRadius: 12, padding: '16px', border: '1px solid #e9d5ff' }}>
                                                    <div style={{ fontSize: 11, color: '#6b21a8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Genel AI Değerlendirmesi</div>
                                                    <p style={{ margin: 0, color: '#7c3aed', fontSize: 13, lineHeight: 1.7 }}>{scorecard.aiInterviewSummary.overallFeedback}</p>
                                                </div>
                                            )}

                                            {scorecard.aiInterviewSummary.recommendation && (
                                                <div style={{ background: '#fffbeb', borderRadius: 12, padding: '16px', border: '1px solid #fde68a' }}>
                                                    <div style={{ fontSize: 11, color: '#92400e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>AI Önerisi</div>
                                                    <p style={{ margin: 0, color: '#78350f', fontSize: 13, lineHeight: 1.7 }}>{scorecard.aiInterviewSummary.recommendation}</p>
                                                </div>
                                            )}

                                            {/* AI Interview Q&A */}
                                            {scorecard?.aiInterviewQas?.length > 0 && (
                                                <div>
                                                    <h4 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: 14 }}>🎙️ Mülakat Soru & Cevap</h4>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                        {scorecard.aiInterviewQas.map((qa, i) => (
                                                            <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '14px', border: '1px solid #e2e8f0' }}>
                                                                <div style={{ fontWeight: 700, color: '#334155', marginBottom: 6, fontSize: 13 }}>S{i + 1}: {qa.question}</div>
                                                                <div style={{ color: '#475569', fontSize: 13, lineHeight: 1.6, paddingLeft: 12, borderLeft: '3px solid #764ba2' }}>{qa.answer || <em style={{ color: '#94a3b8' }}>Cevap yok</em>}</div>
                                                                {qa.aiScore !== null && qa.aiScore !== undefined && (
                                                                    <div style={{ marginTop: 6, fontSize: 12, color: '#764ba2', fontWeight: 700 }}>AI Puanı: {Number(qa.aiScore).toFixed(1)}</div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                                            <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
                                            <p>Henüz AI mülakat verisi bulunmuyor.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ═══ TAB: Contact & CV ═══ */}
                            {activeTab === 'contact' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        {/* Contact */}
                                        <div style={{ background: '#f8fafc', borderRadius: 12, padding: '18px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>İletişim Bilgileri</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#475569', lineHeight: 1.8 }}>
                                                <div><strong>E-posta:</strong>{' '}
                                                    {candidate.email ? <a href={`mailto:${candidate.email}`} style={{ color: '#4f46e5' }}>{candidate.email}</a> : '—'}
                                                </div>
                                                <div><strong>Konum:</strong> {candidate.location || '—'}</div>
                                                <div><strong>LinkedIn:</strong>{' '}
                                                    {candidate.linkedInProfile
                                                        ? <a href={candidate.linkedInProfile} target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5' }}>Profili Görüntüle</a>
                                                        : '—'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Cover Letter */}
                                        <div style={{ background: '#f8fafc', borderRadius: 12, padding: '18px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Ön Yazı</div>
                                            <div style={{ background: '#fff', borderRadius: 8, padding: '14px', minHeight: 120, fontSize: 13, color: '#475569', fontStyle: 'italic', lineHeight: 1.7, border: '1px solid #e2e8f0' }}>
                                                "{candidate.coverLetter || 'Aday bu başvuru için ön yazı sağlamadı.'}"
                                            </div>
                                        </div>
                                    </div>

                                    {/* CV download */}
                                    <div style={{ background: '#f0f9ff', borderRadius: 12, padding: '18px', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <h4 style={{ margin: '0 0 4px 0', color: '#0369a1', fontSize: 14 }}>📄 Özgeçmiş (CV)</h4>
                                            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Aday tarafından yüklenen CV dosyasına erişin</p>
                                        </div>
                                        {candidate.cvUrl
                                            ? <a href={candidate.cvUrl} target="_blank" rel="noopener noreferrer" style={{ background: '#0369a1', color: '#fff', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>📄 CV'yi İndir / Görüntüle</a>
                                            : <span style={{ color: '#94a3b8', fontSize: 13 }}>CV yüklenmemiş</span>}
                                    </div>
                                </div>
                            )}

                            {/* ═══ TAB: Pipeline ═══ */}
                            {activeTab === 'pipeline' && (
                                <div>
                                    <h3 style={{ margin: '0 0 20px 0', color: '#1e293b', fontSize: 16 }}>📈 Başvuru Süreci Durumu</h3>

                                    {/* Timeline */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 24 }}>
                                        {pipelineStages.map((s, idx) => {
                                            let bg = '#f1f5f9', textCol = '#94a3b8', borderCol = '#e2e8f0';
                                            if (isCompleted) { bg = s.color; textCol = '#fff'; borderCol = s.color; }
                                            else if (isRejected) {
                                                if (idx < currentIdx) { bg = '#48bb78'; textCol = '#fff'; borderCol = '#48bb78'; }
                                                else if (idx === currentIdx) { bg = '#e53e3e'; textCol = '#fff'; borderCol = '#e53e3e'; }
                                            } else {
                                                if (idx < currentIdx) { bg = '#48bb78'; textCol = '#fff'; borderCol = '#48bb78'; }
                                                else if (idx === currentIdx) { bg = s.color + '22'; textCol = s.color; borderCol = s.color; }
                                            }
                                            const mark = isCompleted ? '✓' : (isRejected && idx === currentIdx) ? '✕' : (idx < currentIdx ? '✓' : String(idx + 1));
                                            return (
                                                <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto', minWidth: 64 }}>
                                                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: bg, border: `2px solid ${borderCol}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: textCol, fontWeight: '700' }}>{mark}</div>
                                                        <div style={{ fontSize: 10, color: idx === currentIdx ? (isRejected ? '#e53e3e' : s.color) : (idx < currentIdx ? '#48bb78' : '#94a3b8'), textAlign: 'center', marginTop: 6, fontWeight: idx === currentIdx ? '700' : '500' }}>{s.label}</div>
                                                    </div>
                                                    {idx < pipelineStages.length - 1 && (
                                                        <div style={{ flex: 1, height: 2, background: idx < currentIdx ? '#48bb78' : '#e2e8f0', margin: '0 2px', marginBottom: 20 }} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {isRejected && candidate.rejectionReason && (
                                        <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 10, padding: '14px 18px', color: '#c53030', fontSize: 13 }}>
                                            <strong>Red Nedeni:</strong> {candidate.rejectionReason}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── Footer Actions ─────────────────────────── */}
                <div style={{ padding: '16px 32px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: '#f8fafc', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {candidate.cvUrl && (
                            <a href={candidate.cvUrl} target="_blank" rel="noopener noreferrer"
                               style={{ padding: '9px 18px', background: '#334155', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                📄 CV'yi Görüntüle
                            </a>
                        )}
                        <button onClick={() => setIsMeetingOpen(true)}
                                style={{ padding: '9px 18px', background: '#ec4899', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                            📅 Mülakat Planla
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={handleReject} disabled={rejectLoading}
                                style={{ padding: '9px 18px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                            {rejectLoading ? 'İşleniyor...' : '❌ Adayı Reddet'}
                        </button>
                        <button onClick={onClose}
                                style={{ padding: '9px 18px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                            Kapat
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Meeting Sub-Modal ─────────────────────────── */}
            {isMeetingOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}
                     onClick={() => setIsMeetingOpen(false)}>
                    <div style={{ background: '#fff', borderRadius: 14, width: 480, padding: '28px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
                         onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 20px 0', color: '#e67e22', fontSize: 16 }}>📅 Mülakat Daveti Oluştur</h3>
                        <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: 13 }}>
                            Şu aday için görüşme planlayın: <strong>{candidate.candidateFullName}</strong>.
                        </p>
                        {[
                            { label: 'Mülakat Başlığı *', key: 'meetingTitle', type: 'text', placeholder: 'Örn: Final Mülakat - Backend' },
                            { label: 'Tarih ve Saat *', key: 'scheduledDate', type: 'datetime-local', placeholder: '' },
                            { label: 'Toplantı Bağlantısı (Meet/Zoom/Teams) *', key: 'meetingLink', type: 'url', placeholder: 'https://meet.google.com/...' },
                        ].map(({ label, key, type, placeholder }) => (
                            <div key={key} style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', marginBottom: 5, fontWeight: 700, fontSize: 13, color: '#334155' }}>{label}</label>
                                <input type={type} value={meetingData[key]} placeholder={placeholder}
                                       onChange={e => setMeetingData({ ...meetingData, [key]: e.target.value })}
                                       style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                            </div>
                        ))}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', marginBottom: 5, fontWeight: 700, fontSize: 13, color: '#334155' }}>Toplantı Türü</label>
                            <select value={meetingData.meetingType} onChange={e => setMeetingData({ ...meetingData, meetingType: e.target.value })}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
                                <option value="HR_SCREENING">İK Ön Görüşme</option>
                                <option value="TECHNICAL_INTERVIEW">Teknik Mülakat</option>
                                <option value="FINAL_INTERVIEW">Final Mülakat</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={handleSendMeeting} disabled={meetingLoading}
                                    style={{ flex: 1, padding: '12px', background: '#e67e22', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                                {meetingLoading ? 'Gönderiliyor...' : '📨 Oluştur & Davet Gönder'}
                            </button>
                            <button onClick={() => setIsMeetingOpen(false)}
                                    style={{ flex: 0, padding: '12px 18px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                                İptal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Podium Card ─────────────────────────────────────────────────────────────

function PodiumCard({ candidate, medal, rank, onClick }) {
    if (!candidate) return <div className={`${styles.podiumSlot} ${styles.empty}`}><span className={styles.emptyLabel}>Aday yok</span></div>;
    const score = candidate.finalWeightedScore ?? candidate.cvAnalysisScore ?? 0;
    return (
        <div className={`${styles.podiumCard} ${styles[`rank${rank}`]}`} onClick={() => onClick(candidate)}>
            <div className={styles.medal}>{medal}</div>
            <div className={styles.podiumAvatar}>{(candidate.candidateFullName || '?').charAt(0).toUpperCase()}</div>
            <div className={styles.podiumName}>{candidate.candidateFullName || 'Aday'}</div>
            <div className={styles.podiumScore}>{Number(score).toFixed(1)}</div>
            <div className={styles.podiumScoreLbl}>Final Puanı</div>
            <div className={styles.podiumMini}>
                <span>NLP: <b>{candidate.cvAnalysisScore !== null && candidate.cvAnalysisScore !== undefined ? Number(candidate.cvAnalysisScore).toFixed(0) : '—'}</b></span>
                <span>Beceri: <b>{candidate.skillsTestScore !== null && candidate.skillsTestScore !== undefined ? Number(candidate.skillsTestScore).toFixed(0) : '—'}</b></span>
                <span>İng: <b>{candidate.englishTestScore !== null && candidate.englishTestScore !== undefined ? Number(candidate.englishTestScore).toFixed(0) : '—'}</b></span>
                <span>AI: <b>{candidate.aiInterviewScore !== null && candidate.aiInterviewScore !== undefined ? Number(candidate.aiInterviewScore).toFixed(0) : '—'}</b></span>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BestCandidates() {
    const [jobs, setJobs] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState('');
    const [rankings, setRankings] = useState([]);
    const [jobsLoading, setJobsLoading] = useState(true);
    const [rankLoading, setRankLoading] = useState(false);
    const [detailCandidate, setDetailCandidate] = useState(null);

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const token = localStorage.getItem('jwToken');
                const res = await axios.get(process.env.REACT_APP_API_BASE_URL + '/api/v1/JobPostings/dashboard/list', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
                    setJobs(res.data.data);
                    setSelectedJobId(res.data.data[0].jobId || res.data.data[0].id || '');
                }
            } catch (e) {
                console.error('Jobs fetch error:', e);
            } finally {
                setJobsLoading(false);
            }
        };
        fetchJobs();
    }, []);

    useEffect(() => {
        if (!selectedJobId) return;
        const fetchRankings = async () => {
            try {
                setRankLoading(true);
                const token = localStorage.getItem('jwToken');
                const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/v1/Evaluations/rankings/${selectedJobId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRankings(Array.isArray(res.data) ? res.data : []);
            } catch (e) {
                console.error('Rankings fetch error:', e);
                setRankings([]);
            } finally {
                setRankLoading(false);
            }
        };
        fetchRankings();
    }, [selectedJobId]);

    const top3 = rankings.slice(0, 3);
    const rest = rankings.slice(3);

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.title}>🏆 En İyi Adaylar</h1>
                    <p className={styles.subtitle}>İş ilanınız için en yüksek puan alan adayları inceleyin.</p>
                </div>
                {!jobsLoading && (
                    <select className={styles.jobSelect} value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)}>
                        {jobs.map(j => (
                            <option key={j.jobId || j.id} value={j.jobId || j.id}>{j.jobTitle}</option>
                        ))}
                    </select>
                )}
            </div>

            {rankLoading ? (
                <div className={styles.loadingFull}>
                    <div className={styles.spinner} />
                    <p>Sıralamalar yükleniyor...</p>
                </div>
            ) : rankings.length === 0 ? (
                <div className={styles.emptyState}>
                    <span>🎯</span>
                    <h3>Bu ilan için henüz hiçbir değerlendirme tamamlanmadı.</h3>
                    <p>Adaylar değerlendirmelerini tamamladıkça burada görünecekler.</p>
                </div>
            ) : (
                <>
                    {/* Podium */}
                    <div className={styles.podiumWrap}>
                        <PodiumCard candidate={top3[1]} medal="🥈" rank={2} onClick={setDetailCandidate} />
                        <PodiumCard candidate={top3[0]} medal="🥇" rank={1} onClick={setDetailCandidate} />
                        <PodiumCard candidate={top3[2]} medal="🥉" rank={3} onClick={setDetailCandidate} />
                    </div>

                    {/* Full ranking table */}
                    {rankings.length > 0 && (
                        <div className={styles.tableSection}>
                            <h2 className={styles.tableTitle}>Tüm Sıralama</h2>
                            <div className={styles.tableWrap}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Aday</th>
                                            <th>NLP CV</th>
                                            <th>Beceri</th>
                                            <th>İngilizce</th>
                                            <th>AI Mülakat</th>
                                            <th>Final</th>
                                            <th>Detaylar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rankings.map((c, i) => (
                                            <tr key={c.applicationId || i} className={i < 3 ? styles.topRow : ''}>
                                                <td><span className={styles.rankNum}>{i + 1}</span></td>
                                                <td>
                                                    <div className={styles.candCell}>
                                                        <div className={styles.miniAvatar}>{(c.candidateFullName || '?').charAt(0)}</div>
                                                        <div>
                                                            <div className={styles.candName}>{c.candidateFullName || 'Aday'}</div>
                                                            <div className={styles.candEmail}>{c.email || '—'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td><ScoreBadge score={c.cvAnalysisScore} /></td>
                                                <td><ScoreBadge score={c.skillsTestScore} /></td>
                                                <td><ScoreBadge score={c.englishTestScore} /></td>
                                                <td><ScoreBadge score={c.aiInterviewScore} /></td>
                                                <td><ScoreBadge score={c.finalWeightedScore} /></td>
                                                <td>
                                                    <button className={styles.detailBtn} onClick={() => setDetailCandidate(c)}>
                                                        İncele →
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {detailCandidate && (
                <CandidateDetailModal candidate={detailCandidate} onClose={() => setDetailCandidate(null)} />
            )}
        </div>
    );
}
