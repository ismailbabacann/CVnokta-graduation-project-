import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './ProfileJobs.module.css';
import jobLogo from '../../../assets/job_logo.png';

function ProfileJobs() {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');

    // Modal state was here previously, now removed.

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const response = await axios.get('https://localhost:9001/api/v1/JobPostings/public');
                let fetchedJobs = [];
                if (response.data && response.data.data) {
                    fetchedJobs = response.data.data;
                } else if (Array.isArray(response.data)) {
                    fetchedJobs = response.data;
                }

                setJobs(fetchedJobs);
                setFilteredJobs(fetchedJobs);
                setError(null);
            } catch (err) {
                console.error('Error fetching public jobs:', err);
                setError('İş ilanları yüklenirken bir sorun oluştu.');
            } finally {
                setLoading(false);
            }
        };

        fetchJobs();
    }, []);

    // Apply filters whenever state changes
    useEffect(() => {
        let result = [...jobs];

        if (searchTerm) {
            result = result.filter(job => 
                (job.jobTitle && job.jobTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (job.companyName && job.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        if (locationFilter) {
            result = result.filter(job => 
                job.location && job.location.toLowerCase().includes(locationFilter.toLowerCase())
            );
        }

        if (sortOrder === 'newest') {
            // Assume highest ID or created date logic 
            // In absence of exact dates in data from public API, we'll reverse or sort by ID desc
            result.sort((a, b) => (b.id || 0) - (a.id || 0));
        } else if (sortOrder === 'oldest') {
            result.sort((a, b) => (a.id || 0) - (b.id || 0));
        }

        setFilteredJobs(result);
    }, [searchTerm, locationFilter, sortOrder, jobs]);

    // Distinct locations for drop-down
    const uniqueLocations = [...new Set(jobs.map(j => j.location).filter(Boolean))];

    const handleApplyClick = (id) => {
        navigate(`/profile/jobs/${id}`);
    };

    return (
        <div className={styles.jobsContainer}>
            <div className={styles.header}>
                <h2>Tüm İlanlar</h2>
                <p>Kariyeriniz için en uygun ilanları keşfedin.</p>
            </div>

            <div className={styles.filtersPanel}>
                <div className={styles.filterGroup}>
                    <label>Pozisyon veya Şirket Ara</label>
                    <input 
                        type="text" 
                        placeholder="Örn: Frontend Developer..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.filterInput}
                    />
                </div>
                
                <div className={styles.filterGroup}>
                    <label>Lokasyon</label>
                    <select 
                        value={locationFilter} 
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="">Tümü</option>
                        {uniqueLocations.map(loc => (
                            <option key={loc} value={loc}>{loc}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label>Sıralama</label>
                    <select 
                        value={sortOrder} 
                        onChange={(e) => setSortOrder(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="newest">En Yeni İlanlar</option>
                        <option value="oldest">En Eski İlanlar</option>
                    </select>
                </div>
            </div>

            <div className={styles.jobList}>
                {loading ? (
                    <div className={styles.messageState}>İlanlar yükleniyor...</div>
                ) : error ? (
                    <div className={`${styles.messageState} ${styles.error}`}>{error}</div>
                ) : filteredJobs.length === 0 ? (
                    <div className={styles.messageState}>Arama kriterlerinize uygun ilan bulunamadı.</div>
                ) : (
                    filteredJobs.map((job) => (
                        <div key={job.id} className={styles.jobCard}>
                            <div className={styles.cardHeader}>
                                <div className={styles.companyLogo}>
                                    <img src={jobLogo} alt="Job Offer" />
                                </div>
                                <div className={styles.jobInfo}>
                                    <h3 className={styles.jobTitle}>{job.jobTitle}</h3>
                                    <span className={styles.workType}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                        {job.workType || 'Tam Zamanlı'}
                                    </span>
                                </div>
                            </div>
                            
                            <p className={styles.jobDesc}>
                                {job.department ? `${job.department} Departmanı` : 'Detaylar için ilanı inceleyin.'}
                            </p>
                            
                            <div className={styles.cardFooter}>
                                <div className={styles.location}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 15 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></svg>
                                    {job.location || 'Belirtilmedi'}
                                </div>
                                <button
                                    className={styles.applyBtn}
                                    onClick={() => handleApplyClick(job.id)}
                                >
                                    İncele ve Başvur
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default ProfileJobs;
