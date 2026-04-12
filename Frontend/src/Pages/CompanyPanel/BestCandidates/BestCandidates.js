import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './BestCandidates.module.css';

const STAGE_LABELS = {
    CV_ANALYSIS: 'NLP CV Analizi',
    SKILLS_TEST: 'Genel Beceri Testi',
    ENGLISH_TEST: 'İngilizce Testi',
    AI_INTERVIEW: 'AI Mülakat',
};

const ScoreBadge = ({ score }) => {
    if (score === null || score === undefined) return <span className={styles.scorePending}>Bekleniyor</span>;
    const num = Number(score);
    const cls = num >= 70 ? styles.scoreHigh : num >= 50 ? styles.scoreMid : styles.scoreLow;
    return <span className={`${styles.scoreBadge} ${cls}`}>{num.toFixed(1)}</span>;
};

const ScoreBar = ({ score, label }) => {
    const num = score !== null && score !== undefined ? Number(score) : null;
    return (
        <div className={styles.scoreBarWrap}>
            <span className={styles.scoreBarLabel}>{label}</span>
            <div className={styles.scoreBarTrack}>
                <div
                    className={styles.scoreBarFill}
                    style={{ width: `${num ?? 0}%`, background: num === null ? '#e2e8f0' : num >= 70 ? '#10b981' : num >= 50 ? '#f59e0b' : '#ef4444' }}
                />
            </div>
            <span className={styles.scoreBarValue}>{num !== null ? `${num.toFixed(1)}%` : '—'}</span>
        </div>
    );
};

function CandidateDetailModal({ candidate, onClose }) {
    const [scorecard, setScorecard] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!candidate?.applicationId) { setLoading(false); return; }
        const fetchScorecard = async () => {
            try {
                const token = localStorage.getItem('jwToken');
                const res = await axios.get(`https://localhost:9001/api/v1/Evaluations/scorecard/${candidate.applicationId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setScorecard(res.data);
            } catch (e) {
                console.error('Scorecard fetch error:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchScorecard();
    }, [candidate]);

    if (!candidate) return null;

    const cvScore = scorecard?.cvAnalysisResult?.analysisScore ?? candidate.cvAnalysisScore;
    const skillScore = scorecard?.generalTestResult?.score ?? candidate.skillsTestScore;
    const engScore = scorecard?.englishTestScore ?? candidate.englishTestScore;
    const aiScore = scorecard?.aiInterviewSummary?.overallInterviewScore ?? candidate.aiInterviewScore;
    const finalScore = scorecard?.finalEvaluationScore?.weightedFinalScore ?? candidate.finalWeightedScore;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.detailModal} onClick={e => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose}>✕</button>

                {/* Header */}
                <div className={styles.detailHeader}>
                    <div className={styles.detailAvatar}>
                        {(candidate.candidateFullName || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 className={styles.detailName}>{candidate.candidateFullName || 'Aday'}</h2>
                        <p className={styles.detailEmail}>{candidate.email || '—'}</p>
                        <div className={styles.rankChip}>#{candidate.rankPosition} sırada</div>
                    </div>
                    {finalScore !== null && finalScore !== undefined && (
                        <div className={styles.finalScoreCircle}>
                            <span className={styles.finalScoreNum}>{Number(finalScore).toFixed(1)}</span>
                            <span className={styles.finalScoreLbl}>Final</span>
                        </div>
                    )}
                </div>

                {/* Scores */}
                <div className={styles.detailBody}>
                    {loading ? (
                        <div className={styles.loadingMsg}>
                            <div className={styles.spinner} />
                            <p>Puan kartı yükleniyor...</p>
                        </div>
                    ) : (
                        <>
                            <h3 className={styles.sectionTitle}>📊 Aşama Puanları</h3>
                            <ScoreBar score={cvScore} label="🧠 NLP CV Analizi" />
                            <ScoreBar score={skillScore} label="⚙️ Genel Beceri Testi" />
                            <ScoreBar score={engScore} label="🇬🇧 İngilizce Testi" />
                            <ScoreBar score={aiScore} label="🤖 AI Mülakat" />

                            {scorecard?.cvAnalysisResult?.matchedSkills?.length > 0 && (
                                <div className={styles.skillsSection}>
                                    <h4>✅ Eşleşen Yetenekler</h4>
                                    <div className={styles.skillTags}>
                                        {scorecard.cvAnalysisResult.matchedSkills.map((s, i) => (
                                            <span key={i} className={styles.skillTag}>{s}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {scorecard?.cvAnalysisResult?.missingSkills?.length > 0 && (
                                <div className={styles.skillsSection}>
                                    <h4>⚠️ Eksik Yetenekler</h4>
                                    <div className={styles.skillTags}>
                                        {scorecard.cvAnalysisResult.missingSkills.map((s, i) => (
                                            <span key={i} className={`${styles.skillTag} ${styles.missingTag}`}>{s}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {scorecard?.aiInterviewSummary?.strengths && (
                                <div className={styles.aiSection}>
                                    <h4>💪 AI Mülakat – Güçlü Yönler</h4>
                                    <p>{scorecard.aiInterviewSummary.strengths}</p>
                                </div>
                            )}

                            {scorecard?.aiInterviewSummary?.weaknesses && (
                                <div className={styles.aiSection}>
                                    <h4>🔻 AI Mülakat – Gelişim Alanları</h4>
                                    <p>{scorecard.aiInterviewSummary.weaknesses}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className={styles.detailActions}>
                    {candidate.cvUrl && (
                        <a href={candidate.cvUrl} target="_blank" rel="noopener noreferrer" className={styles.btnPrimary}>
                            📄 CV İndir
                        </a>
                    )}
                    <button className={styles.btnSecondary} onClick={onClose}>Kapat</button>
                </div>
            </div>
        </div>
    );
}

function PodiumCard({ candidate, medal, rank, onClick }) {
    if (!candidate) return <div className={`${styles.podiumSlot} ${styles.empty}`}><span className={styles.emptyLabel}>Aday yok</span></div>;
    const score = candidate.finalWeightedScore ?? candidate.cvAnalysisScore ?? 0;
    return (
        <div className={`${styles.podiumCard} ${styles[`rank${rank}`]}`} onClick={() => onClick(candidate)}>
            <div className={styles.medal}>{medal}</div>
            <div className={styles.podiumAvatar}>{(candidate.candidateFullName || '?').charAt(0).toUpperCase()}</div>
            <div className={styles.podiumName}>{candidate.candidateFullName || 'Aday'}</div>
            <div className={styles.podiumScore}>{Number(score).toFixed(1)}</div>
            <div className={styles.podiumScoreLbl}>Final Puan</div>
            <div className={styles.podiumMini}>
                <span>NLP: <b>{candidate.cvAnalysisScore !== null && candidate.cvAnalysisScore !== undefined ? Number(candidate.cvAnalysisScore).toFixed(0) : '—'}</b></span>
                <span>Beceri: <b>{candidate.skillsTestScore !== null && candidate.skillsTestScore !== undefined ? Number(candidate.skillsTestScore).toFixed(0) : '—'}</b></span>
                <span>İng: <b>{candidate.englishTestScore !== null && candidate.englishTestScore !== undefined ? Number(candidate.englishTestScore).toFixed(0) : '—'}</b></span>
                <span>AI: <b>{candidate.aiInterviewScore !== null && candidate.aiInterviewScore !== undefined ? Number(candidate.aiInterviewScore).toFixed(0) : '—'}</b></span>
            </div>
        </div>
    );
}

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
                const res = await axios.get('https://localhost:9001/api/v1/JobPostings/dashboard/list', {
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
                const res = await axios.get(`https://localhost:9001/api/v1/Evaluations/rankings/${selectedJobId}`, {
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
                    <p className={styles.subtitle}>İlanınız için en yüksek final puanına sahip adayları inceleyin.</p>
                </div>
                {!jobsLoading && (
                    <select
                        className={styles.jobSelect}
                        value={selectedJobId}
                        onChange={e => setSelectedJobId(e.target.value)}
                    >
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
                    <h3>Bu ilan için henüz değerlendirme tamamlanmamış.</h3>
                    <p>Adaylar sınavları tamamladıkça burada görünecek.</p>
                </div>
            ) : (
                <>
                    {/* Podium */}
                    <div className={styles.podiumWrap}>
                        <PodiumCard candidate={top3[1]} medal="🥈" rank={2} onClick={setDetailCandidate} />
                        <PodiumCard candidate={top3[0]} medal="🥇" rank={1} onClick={setDetailCandidate} />
                        <PodiumCard candidate={top3[2]} medal="🥉" rank={3} onClick={setDetailCandidate} />
                    </div>

                    {/* Full table */}
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
                                            <th>Detay</th>
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
