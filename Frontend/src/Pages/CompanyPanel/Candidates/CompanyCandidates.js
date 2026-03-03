import React, { useState } from 'react';
import styles from './CompanyCandidates.module.css';

function CompanyCandidates() {
    const [sortBy, setSortBy] = useState('nlp_desc'); // default sort: highest NLP first

    // Enhanced dummy data with NLP scores
    const initialCandidates = [
        { id: 101, name: 'Ayşe Yılmaz', role: 'Data Analyst', date: '12 Eki 2024', exp: '3 Yıl', edu: 'Yüksek Lisans', nlpScore: 95, status: 'Yeni' },
        { id: 102, name: 'Ali Demir', role: 'Frontend Developer', date: '14 Eki 2024', exp: '5 Yıl', edu: 'Lisans', nlpScore: 88, status: 'Mülakatta' },
        { id: 103, name: 'Zeynep Kaya', role: 'Security Engineer', date: '10 Eki 2024', exp: '1 Yıl', edu: 'Lisans', nlpScore: 65, status: 'İncelendi' },
        { id: 104, name: 'Mehmet Öz', role: 'Data Analyst', date: '15 Eki 2024', exp: '7 Yıl', edu: 'Doktora', nlpScore: 92, status: 'Yeni' },
        { id: 105, name: 'Elif Çelik', role: 'HR Specialist', date: '11 Eki 2024', exp: '2 Yıl', edu: 'Lisans', nlpScore: 78, status: 'Reddedildi' },
    ];

    // Sorting logic
    const sortedCandidates = [...initialCandidates].sort((a, b) => {
        if (sortBy === 'nlp_desc') {
            return b.nlpScore - a.nlpScore;
        } else if (sortBy === 'nlp_asc') {
            return a.nlpScore - b.nlpScore;
        } else if (sortBy === 'newest') {
            // Very basic string parsing for demo purposes
            return new Date(b.date.replace('Eki', 'Oct')) - new Date(a.date.replace('Eki', 'Oct'));
        }
        return 0;
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
                            <option value="nlp_desc">Sıralama: En Yüksek NLP Skoru</option>
                            <option value="nlp_asc">Sıralama: En Düşük NLP Skoru</option>
                            <option value="newest">Sıralama: En Yeni Başvuru</option>
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
                        {sortedCandidates.map(cand => (
                            <tr key={cand.id}>
                                <td>
                                    <div className={styles.candidateInfo}>
                                        <div className={styles.avatar}>{cand.name.charAt(0)}</div>
                                        <div>
                                            <div className={styles.candName}>{cand.name}</div>
                                            <div className={styles.candId}>ID: #{cand.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.roleText}>{cand.role}</div>
                                </td>
                                <td>
                                    <div className={styles.dateText}>{cand.date}</div>
                                </td>
                                <td>
                                    <div className={styles.expEduText}>
                                        <span className={styles.tag}>{cand.exp}</span>
                                        <span className={styles.tag}>{cand.edu}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.nlpWrapper}>
                                        <span className={`${styles.nlpScoreBadge} ${cand.nlpScore >= 90 ? styles.scoreHigh : cand.nlpScore >= 75 ? styles.scoreMedium : styles.scoreLow}`}>
                                            %{cand.nlpScore} Uyum
                                        </span>
                                        {cand.nlpScore >= 90 && <span className={styles.sparkle}>✨</span>}
                                    </div>
                                </td>
                                <td>
                                    <button className={styles.actionBtn}>Profili İncele</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className={styles.pagination}>
                    <span>Sistemde toplam 5 aday bulunuyor</span>
                </div>
            </div>
        </div>
    );
}

export default CompanyCandidates;
