import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './CompanyJobs.module.css';

function CompanyJobs() {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Search, Filter and Pagination States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const [jobCandidates, setJobCandidates] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);
    
    // Modal Bulk Action States
    const [candSearchTerm, setCandSearchTerm] = useState('');
    const [selectedCandIds, setSelectedCandIds] = useState([]);
    const [isTestPromptOpen, setIsTestPromptOpen] = useState(false);
    const [testContext, setTestContext] = useState('');
    const [testType, setTestType] = useState('AI Custom Test');
    const [bulkLoading, setBulkLoading] = useState(false);

    // Pipeline tab states
    const [modalTab, setModalTab] = useState('candidates'); // 'candidates' | 'pipeline'
    const [pipelineSummary, setPipelineSummary] = useState(null);
    const [pipelineLoading, setPipelineLoading] = useState(false);
    const [thresholds, setThresholds] = useState({ cv: 60, english: 70, technical: 70, aiInterview: 60 });
    const [thresholdSaving, setThresholdSaving] = useState(false);
    const [aiRejectLoading, setAiRejectLoading] = useState(false);
    const [aiRejectResults, setAiRejectResults] = useState(null);
    const [aiRejectThreshold, setAiRejectThreshold] = useState(40);

    const loadPipelineSummary = async (jobId) => {
        setPipelineLoading(true);
        try {
            const token = localStorage.getItem('jwToken');
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/v1/Pipeline/${jobId}/summary`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPipelineSummary(res.data);
            setThresholds({
                cv:          res.data.cvPassThreshold          ?? res.data.passThreshold ?? 60,
                english:     res.data.englishPassThreshold     ?? 70,
                technical:   res.data.technicalPassThreshold   ?? 70,
                aiInterview: res.data.aiInterviewPassThreshold ?? 60,
            });
        } catch (e) {
            console.error('Pipeline summary error:', e);
        } finally {
            setPipelineLoading(false);
        }
    };

    const handleSaveThreshold = async () => {
        if (!selectedJob) return;
        setThresholdSaving(true);
        try {
            const token = localStorage.getItem('jwToken');
            const jobId = selectedJob.jobId || selectedJob.id;
            await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/v1/Pipeline/${jobId}/threshold`,
                {
                    passThreshold:            parseInt(thresholds.cv),
                    cvPassThreshold:          parseInt(thresholds.cv),
                    englishPassThreshold:     parseInt(thresholds.english),
                    technicalPassThreshold:   parseInt(thresholds.technical),
                    aiInterviewPassThreshold: parseInt(thresholds.aiInterview),
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('Threshold values saved.');
            loadPipelineSummary(jobId);
        } catch (e) {
            alert('Save error: ' + (e.response?.data?.message || 'Unknown error'));
        } finally {
            setThresholdSaving(false);
        }
    };

    const handleAiBulkReject = async () => {
        if (!selectedJob) return;
        if (!window.confirm(`Candidates below NLP score ${aiRejectThreshold}% will be eliminated. Continue?`)) return;
        setAiRejectLoading(true);
        try {
            const token = localStorage.getItem('jwToken');
            const jobId = selectedJob.jobId || selectedJob.id;
            // Filter candidates with NLP score below threshold and bulk reject them
            const toReject = jobCandidates
                .filter(c => (c.nlpMatchScore || 0) < aiRejectThreshold)
                .map(c => c.applicationId);
            if (toReject.length === 0) {
                alert('No candidates found below this threshold.');
                setAiRejectLoading(false);
                return;
            }
            await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/v1/Applications/bulk-status-update`,
                { applicationIds: toReject, newStatus: 'Rejected' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert(`${toReject.length} candidates eliminated and notification emails sent.`);
            setAiRejectResults(toReject.length);
            // Refresh candidate list and pipeline summary
            loadPipelineSummary(jobId);
            setModalLoading(true);
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/v1/Applications/pool`, {
                    params: { JobPostingId: jobId, PageNumber: 1, PageSize: 100, SortBy: 'nlpscoredesc' },
                    headers: { Authorization: `Bearer ${token}` }
                });
                setJobCandidates(res.data?.data || []);
            } finally {
                setModalLoading(false);
            }
        } catch (e) {
            alert('AI elimination error: ' + (e.response?.data?.message || 'Unknown error'));
        } finally {
            setAiRejectLoading(false);
        }
    };

    const openJobModal = async (job) => {
        setSelectedJob(job);
        setIsModalOpen(true);
        setModalLoading(true);
        setModalTab('candidates');
        setPipelineSummary(null);
        setAiRejectResults(null);
        
        const jobId = job.jobId || job.id;
        try {
            const token = localStorage.getItem('jwToken');
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/v1/Applications/pool`, {
                params: { JobPostingId: jobId, PageNumber: 1, PageSize: 100, SortBy: 'nlpscoredesc' },
                headers: { Authorization: `Bearer ${token}` }
            });
            setJobCandidates(response.data?.data || []);
        } catch (err) {
            console.error("Error fetching job candidates:", err);
            setJobCandidates([]);
        } finally {
            setModalLoading(false);
        }
        // Load pipeline summary in parallel
        loadPipelineSummary(jobId);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedJob(null);
        setJobCandidates([]);
        setCandSearchTerm('');
        setSelectedCandIds([]);
        setIsTestPromptOpen(false);
        setTestContext('');
    };

    const toggleCandidateSelection = (id) => {
        setSelectedCandIds(prev => prev.includes(id) ? prev.filter(candId => candId !== id) : [...prev, id]);
    };

    const handleSelectAll = (filteredCands) => {
        if (selectedCandIds.length === filteredCands.length) {
            setSelectedCandIds([]); // deselect all
        } else {
            setSelectedCandIds(filteredCands.map(c => c.applicationId));
        }
    };

    const handleBulkStatusUpdate = async (newStatus) => {
        if (selectedCandIds.length === 0) {
            alert("Please select at least one candidate to perform this action.");
            return;
        }
        try {
            setBulkLoading(true);
            const token = localStorage.getItem('jwToken');
            await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/v1/Applications/bulk-status-update`, {
                applicationIds: selectedCandIds,
                newStatus: newStatus
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Selected candidates' status updated and automatic notification emails sent.");
            // Reset selection
            setSelectedCandIds([]);
            // Refresh candidate list and pipeline summary
            const jobId = selectedJob?.jobId || selectedJob?.id;
            if (jobId) {
                setModalLoading(true);
                try {
                    const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/v1/Applications/pool`, {
                        params: { JobPostingId: jobId, PageNumber: 1, PageSize: 100, SortBy: 'nlpscoredesc' },
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setJobCandidates(res.data?.data || []);
                } finally {
                    setModalLoading(false);
                }
                loadPipelineSummary(jobId);
            }
        } catch (err) {
            console.error("Bulk action error:", err);
            alert("An error occurred while processing the bulk action.");
        } finally {
            setBulkLoading(false);
        }
    };

    const handleBulkGenerateTest = async () => {
        if (selectedCandIds.length === 0) {
            alert("Please select at least one candidate to send the test.");
            return;
        }
        if (testType === 'AI Custom Test' && !testContext.trim()) {
            alert("Please write the test context in the textarea.");
            return;
        }

        try {
            setBulkLoading(true);
            const token = localStorage.getItem('jwToken');
            
            let assignedContext = testContext;
            if (testType === 'General Aptitude Test') assignedContext = 'Questions measuring candidates\' analytical reasoning and problem-solving skills.';
            else if (testType === 'English Test') assignedContext = 'Multiple choice questions measuring candidates\' business English proficiency.';

            const testPayload = {
                candidateApplicationIds: selectedCandIds,
                context: assignedContext
            };
            await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/v1/JobPostings/generate-exam`, testPayload, {
                 headers: { Authorization: `Bearer ${token}` }
            });
            
            alert(`Automatic exam email sent to ${selectedCandIds.length} candidates and context assigned.`);
            setIsTestPromptOpen(false);
            setTestContext('');
            setTestType('AI Custom Test');
            setSelectedCandIds([]);
        } catch (err) {
            console.error("Bulk test sending error:", err);
            alert("An error occurred while creating or assigning the exam.");
        } finally {
            setBulkLoading(false);
        }
    };

    const handleToggleStatus = async (id, makeActive) => {
        try {
            const token = localStorage.getItem('jwToken');
            await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/v1/JobPostings/${id}/status`, {
                id: id,
                isActive: makeActive
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Optimistically update local state instead of doing a full refetch
            setJobs(prevJobs => prevJobs.map(j => 
                (j.jobId || j.id) === id ? { ...j, status: makeActive ? 'Active' : 'Closed' } : j
            ));
            
            if (selectedJob && (selectedJob.jobId || selectedJob.id) === id) {
                setSelectedJob(prev => ({ ...prev, status: makeActive ? 'Active' : 'Closed' }));
            }
            alert(`Job posting successfully ${makeActive ? 'activated' : 'deactivated'}.`);
        } catch (err) {
            console.error(err);
            alert('An error occurred while updating status.');
        }
    };

    const handleDeleteJob = async () => {
        if(window.confirm("Are you sure you want to remove this posting from the system?")) {
            try {
                const token = localStorage.getItem('jwToken');
                const jobId = selectedJob.jobId || selectedJob.id;
                await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/v1/JobPostings/${jobId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                // Optimistically remove from list
                setJobs(prevJobs => prevJobs.filter(j => (j.jobId || j.id) !== jobId));
                closeModal();
                alert("Job posting successfully deleted.");
            } catch (err) {
                console.error("Delete error:", err);
                alert("An error occurred while deleting the posting.");
            }
        }
    };

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const token = localStorage.getItem('jwToken');
                if (!token) {
                    setError('Session not found. Please log in again.');
                    setLoading(false);
                    return;
                }

                // Call the dashboard job list api
                // Assuming it returns an array in response.data.data
                const response = await axios.get(process.env.REACT_APP_API_BASE_URL + '/api/v1/JobPostings/dashboard/list', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                // Set the jobs using response data depending on the wrapper structure
                if (response.data && response.data.data) {
                    setJobs(response.data.data);
                } else if (Array.isArray(response.data)) {
                    setJobs(response.data);
                } else {
                    setJobs([]); // Fallback
                }

                setError(null);
            } catch (err) {
                console.error('Error fetching company jobs:', err);
                if (err.response && err.response.status === 401) {
                    setError("Your session has expired. Please log in again.");
                } else {
                    setError("An error occurred while loading job postings.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchJobs();
    }, []);

    // Format ID for display
    const formatDisplayId = (job) => {
        if (!job) return '';
        if (job.displayId) return job.displayId;
        return `#${(job.jobId || job.id || '').substring(0, 8).toUpperCase()}`;
    };

    // Calculate dynamic stats from ALL fetched jobs
    const totalApps = jobs.reduce((sum, job) => sum + (job.totalApplications || 0), 0);
    const activeCount = jobs.filter(j => j.status === 'Active').length;
    const totalHighMatch = jobs.reduce((sum, job) => sum + (job.nlpHighMatchCount || 0), 0);

    // Derived states for filtering
    const departments = ['All', ...new Set(jobs.map(j => j.department).filter(Boolean))];

    const filteredJobs = jobs.filter(job => {
        // Don't show deleted or "Pending" postings (User requirement: hidden when deleted or pending)
        if (job.status === 'Deleted' || job.status === 'Pending' || job.isDeleted) return false;

        const matchesSearch = (job.jobTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (job.displayId || job.jobId || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = filterDept === 'All' || job.department === filterDept;

        // Status matching
        let matchesStatus = true;
        if (filterStatus === 'Active') matchesStatus = job.status === 'Active' && !job.isDraft;
        if (filterStatus === 'Draft') matchesStatus = job.status === 'Draft' || job.isDraft;

        return matchesSearch && matchesDept && matchesStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filteredJobs.length / ITEMS_PER_PAGE));
    const paginatedJobs = filteredJobs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterDept, filterStatus]);

    return (
        <div className={styles.container}>
            {/* Header Area */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.title}>Active Job Postings</h1>
                    <p className={styles.subtitle}>Manage candidate applications and review AI-powered matches.</p>
                </div>
                <button className={styles.createBtn} onClick={() => navigate('/company/create-job')}>
                    + Create New Posting
                </button>
            </div>

            {/* Stats Cards */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.blueBg}`}>👥</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Total Applications</span>
                        <span className={styles.statValue}>{loading ? '...' : totalApps}</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.purpleBg}`}>🧠</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>High Match (NLP)</span>
                        <span className={styles.statValue}>{loading ? '...' : totalHighMatch}</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.greenBg}`}>📢</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Active Postings</span>
                        <span className={styles.statValue}>{loading ? '...' : activeCount}</span>
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className={styles.tableSection}>
                <div className={styles.tableControls}>
                    <input
                        type="text"
                        placeholder="Search by job title or ID..."
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className={styles.filters}>
                        <select
                            className={styles.filterSelect}
                            value={filterDept}
                            onChange={(e) => setFilterDept(e.target.value)}
                        >
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept === 'All' ? 'All Departments' : dept}</option>
                            ))}
                        </select>
                        <select
                            className={styles.filterSelect}
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="All">Status: All</option>
                            <option value="Active">Active</option>
                            <option value="Draft">Draft</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>Loading postings...</div>
                ) : error ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>{error}</div>
                ) : jobs.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>You haven't created any postings yet.</div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>POSITION TITLE</th>
                                <th>DEPARTMENT & LOCATION</th>
                                <th>CANDIDATE STATS</th>
                                <th>NLP SCORE</th>
                                <th>STATUS</th>
                                <th>REVIEW</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedJobs.map(job => (
                                <tr key={job.jobId || job.id}>
                                    <td>
                                        <div className={styles.jobTitle}>{job.jobTitle}</div>
                                        <div className={styles.jobId}>ID: {formatDisplayId(job)}</div>
                                    </td>
                                    <td>
                                        <div className={styles.dept}>{job.department}</div>
                                        <div className={styles.loc}>{job.location}</div>
                                    </td>
                                    <td>
                                        <div className={styles.statsCol}>
                                            <div className={styles.statGroup}><strong>{job.totalApplications || 0}</strong><span>Applications</span></div>
                                        </div>
                                    </td>
                                    <td>
                                        {job.isDraft || job.status === 'Draft' ? (
                                            <span style={{ color: '#f39c12', fontWeight: 'bold' }}>Calculating...</span>
                                        ) : job.status === 'Deleted' ? (
                                            <span></span>
                                        ) : (
                                            <div className={styles.nlpWrapper}>
                                                <span className={styles.nlpText} style={{fontWeight: '500'}}>
                                                    70%+ Match: <span style={{color: '#20B2AA', fontWeight: 'bold'}}>{job.nlpHighMatchCount || 0} Candidates</span>
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${styles[job.status === 'Active' ? 'active' : job.status === 'Draft' ? 'draft' : 'pending']}`}>
                                            {job.status === 'Active' && !job.isDraft ? 'Active' : job.status === 'Closed' ? 'Closed' : 'Draft'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={styles.actionLink} onClick={() => openJobModal(job)}>Review Posting</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <div className={styles.pagination}>
                    <span>Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredJobs.length)} of {filteredJobs.length} postings</span>
                    {totalPages > 1 && (
                        <div className={styles.pageButtons}>
                            <button
                                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                            >&lt;</button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                                <button
                                    key={pageNum}
                                    className={currentPage === pageNum ? styles.activePage : ''}
                                    onClick={() => handlePageChange(pageNum)}
                                >
                                    {pageNum}
                                </button>
                            ))}
                            <button
                                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                            >&gt;</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Job Details Modal */}
            {isModalOpen && selectedJob && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <div style={modalHeaderStyle}>
                            <h2 style={{ margin: 0 }}>Posting Details: {selectedJob.jobTitle}</h2>
                            <button onClick={closeModal} style={closeBtnStyle}>X</button>
                        </div>
                        <div style={modalBodyStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 5px 0' }}>{selectedJob.department} - {selectedJob.location}</h3>
                                    <p style={{ margin: 0, color: '#666' }}>ID: {formatDisplayId(selectedJob)}</p>
                                    <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>
                                        Current Status: {selectedJob.status === 'Active' ? <span style={{color: 'green'}}>Active</span> : <span style={{color: 'orange'}}>{selectedJob.status}</span>}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '500px' }}>
                                    <button 
                                        onClick={() => {
                                            const link = `${window.location.origin}/jobs/${selectedJob.jobId || selectedJob.id}`;
                                            navigator.clipboard.writeText(link);
                                            alert("Posting link copied!");
                                        }}
                                        style={{ ...actionBtnStyle, backgroundColor: '#f1c40f', color: '#333' }}
                                    >
                                        🔗 Copy Link
                                    </button>
                                    <button 
                                        onClick={() => navigate('/company/create-job', { state: { jobToCopy: selectedJob } })}
                                        style={{ ...actionBtnStyle, backgroundColor: '#3498db' }}
                                    >
                                        📄 Use as Template
                                    </button>
                                    <button 
                                        onClick={() => navigate('/company/create-job', { state: { jobToEdit: selectedJob } })}
                                        style={{ ...actionBtnStyle, backgroundColor: '#9b59b6' }}
                                    >
                                        ✏️ Edit Posting
                                    </button>
                                    <button 
                                        onClick={() => handleToggleStatus(selectedJob.jobId || selectedJob.id, selectedJob.status !== 'Active')}
                                        style={{ ...actionBtnStyle, backgroundColor: selectedJob.status === 'Active' ? '#f39c12' : '#2ecc71' }}
                                    >
                                        {selectedJob.status === 'Active' ? '⏸ Deactivate' : '▶️ Activate'}
                                    </button>
                                    <button onClick={handleDeleteJob} style={{ ...actionBtnStyle, backgroundColor: '#e74c3c' }}>
                                        🗑️ Delete Posting
                                    </button>
                                </div>
                            </div>
                            
                            <hr style={{ borderColor: '#eee', margin: '20px 0' }} />

                            {/* Modal Tabs */}
                            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '0' }}>
                                <button
                                    onClick={() => setModalTab('candidates')}
                                    style={{
                                        padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: '600',
                                        color: modalTab === 'candidates' ? '#764ba2' : '#888',
                                        borderBottom: modalTab === 'candidates' ? '3px solid #764ba2' : '3px solid transparent',
                                        fontSize: '14px'
                                    }}
                                >👥 Candidates ({jobCandidates.length})</button>
                                <button
                                    onClick={() => setModalTab('pipeline')}
                                    style={{
                                        padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: '600',
                                        color: modalTab === 'pipeline' ? '#764ba2' : '#888',
                                        borderBottom: modalTab === 'pipeline' ? '3px solid #764ba2' : '3px solid transparent',
                                        fontSize: '14px'
                                    }}
                                >📊 Pipeline Status</button>
                            </div>

                            {/* Pipeline Tab */}
                            {modalTab === 'pipeline' && (
                                <div>
                                    {pipelineLoading ? (
                                        <p style={{ textAlign: 'center', color: '#666' }}>Loading pipeline data...</p>
                                    ) : pipelineSummary ? (
                                        <div>
                                            {/* Stage counts */}
                                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
                                                {[
                                                    { label: 'NLP Review',      count: pipelineSummary.nlpReview,          color: '#667eea' },
                                                    { label: 'Skills Test',     count: pipelineSummary.skillsTestPending,   color: '#ed8936' },
                                                    { label: 'English Test',    count: pipelineSummary.englishTestPending,  color: '#00b4db' },
                                                    { label: 'AI Interview',    count: pipelineSummary.aiInterviewPending,  color: '#f5576c' },
                                                    { label: 'Completed',       count: pipelineSummary.completed,           color: '#48bb78' },
                                                    { label: 'Rejected',        count: pipelineSummary.rejected,            color: '#e53e3e' },
                                                ].map(({ label, count, color }) => (
                                                    <div key={label} style={{ flex: '1', minWidth: '100px', background: '#f8f9fa', borderRadius: '10px', padding: '14px 10px', textAlign: 'center', borderTop: `4px solid ${color}` }}>
                                                        <div style={{ fontSize: '22px', fontWeight: '700', color }}>{count ?? 0}</div>
                                                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{label}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Threshold setting */}
                                            <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                                    <h4 style={{ margin: 0, fontSize: '14px', color: '#333' }}>⚙️ Pass Threshold</h4>
                                                    <button
                                                        onClick={handleSaveThreshold}
                                                        disabled={thresholdSaving}
                                                        style={{ padding: '7px 18px', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                                                    >{thresholdSaving ? 'Saving...' : '💾 Save'}</button>
                                                </div>
                                                <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#888' }}>Set a separate pass threshold for each stage. Candidates reaching this score are automatically advanced.</p>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                    {[
                                                        { key: 'cv',          label: '📄 CV Analysis',       color: '#667eea', default: 60 },
                                                        { key: 'english',     label: '🇱🇧 English Test',     color: '#00b4db', default: 70 },
                                                        { key: 'technical',   label: '🛠️ Technical Test',   color: '#ed8936', default: 70 },
                                                        { key: 'aiInterview', label: '🤖 AI Interview',     color: '#f5576c', default: 60 },
                                                    ].map(({ key, label, color, default: def }) => (
                                                        <div key={key} style={{ background: '#fff', borderRadius: '10px', padding: '14px', border: `2px solid ${color}20`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <span style={{ fontSize: '12px', fontWeight: '700', color }}>{label}</span>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <input
                                                                    type="number" min="1" max="100"
                                                                    value={thresholds[key]}
                                                                    onChange={e => setThresholds(prev => ({ ...prev, [key]: e.target.value }))}
                                                                    style={{ width: '70px', padding: '6px', borderRadius: '8px', border: `2px solid ${color}`, fontSize: '18px', fontWeight: '700', textAlign: 'center', color }}
                                                                />
                                                                <span style={{ color: '#888', fontSize: '13px', fontWeight: '600' }}>%</span>
                                                                <span style={{ fontSize: '11px', color: '#bbb' }}>Default: %{def}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Bulk actions */}
                                            <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '10px', padding: '18px' }}>
                                                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#c53030' }}>🤖 AI Bulk Reject</h4>
                                                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#666' }}>Automatically eliminates all candidates below your specified NLP threshold and sends notification emails.</p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                    <label style={{ fontSize: '13px', color: '#555', fontWeight: '600' }}>NLP &lt;</label>
                                                    <input
                                                        type="number" min="1" max="100"
                                                        value={aiRejectThreshold}
                                                        onChange={e => setAiRejectThreshold(Number(e.target.value))}
                                                        style={{ width: '70px', padding: '8px', borderRadius: '8px', border: '2px solid #e53e3e', fontSize: '15px', fontWeight: '700', textAlign: 'center' }}
                                                    />
                                                    <span style={{ color: '#555' }}>% reject those below</span>
                                                    <button
                                                        onClick={handleAiBulkReject}
                                                        disabled={aiRejectLoading}
                                                        style={{ padding: '8px 20px', background: 'linear-gradient(135deg,#e53e3e,#c53030)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                                                    >{aiRejectLoading ? 'Processing...' : '🚫 AI Bulk Reject'}</button>
                                                    {aiRejectResults !== null && <span style={{ color: '#48bb78', fontWeight: '600', fontSize: '13px' }}>✓ {aiRejectResults} candidates rejected</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p style={{ textAlign: 'center', color: '#aaa' }}>No pipeline data available.</p>
                                    )}
                                </div>
                            )}

                            {/* Candidates Tab */}
                            {modalTab === 'candidates' && <h3 style={{marginBottom: '10px'}}>Candidates Who Applied to This Posting</h3>}
                            {modalLoading ? (
                                <p style={{textAlign: 'center', color: '#666'}}>Loading candidates...</p>
                            ) : jobCandidates.length === 0 ? (
                                <p style={{textAlign: 'center', color: '#666'}}>No applications have been made for this posting yet.</p>
                            ) : (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                                        <input 
                                            type="text" 
                                            placeholder="Search Candidate..." 
                                            value={candSearchTerm}
                                            onChange={(e) => setCandSearchTerm(e.target.value)}
                                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', width: '250px' }}
                                        />
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button 
                                                onClick={() => {
                                                    if(window.confirm("Are you sure you want to reject the selected candidates? Automatic rejection emails will be sent.")) {
                                                        handleBulkStatusUpdate('Rejected');
                                                    }
                                                }}
                                                style={{...actionBtnStyle, backgroundColor: '#e74c3c'}}
                                                disabled={selectedCandIds.length === 0}
                                            >
                                                🚫 Bulk Reject ({selectedCandIds.length})
                                            </button>
                                        </div>
                                    </div>

                                    {isTestPromptOpen && (
                                        <div style={{...modalOverlayStyle, zIndex: 1050, backdropFilter: 'blur(4px)'}}>
                                            <div style={{...modalContentStyle, width: '600px', borderRadius: '12px', overflow: 'hidden'}}>
                                                <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', padding: '20px', color: 'white' }}>
                                                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>🤖 Exam / Test Selection</h3>
                                                </div>
                                                <div style={{ padding: '25px', backgroundColor: '#f8fafc' }}>
                                                    <p style={{ marginBottom: '15px', color: '#475569' }}>
                                                        Select the <strong>{selectedCandIds.length} candidates</strong> test type to assign. You can create standard tests or AI-powered custom contexts.
                                                    </p>
                                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#334155' }}>Select Test Type:</label>
                                                    <select 
                                                        value={testType} 
                                                        onChange={(e) => setTestType(e.target.value)} 
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}
                                                    >
                                                        <option value="General Aptitude Test">General Aptitude Test</option>
                                                        <option value="English Test">English Test</option>
                                                        <option value="AI Custom Test">🤖 Create Custom AI Test</option>
                                                    </select>

                                                    {testType === 'AI Custom Test' && (
                                                        <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                                                            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#334155' }}>Context and Questions:</label>
                                                            <textarea 
                                                                value={testContext}
                                                                onChange={e => setTestContext(e.target.value)}
                                                                placeholder="Write the interview context or specific questions for the AI to use as a base..."
                                                                style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '10px', resize: 'vertical' }}
                                                            />
                                                        </div>
                                                    )}

                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                                                        <button onClick={() => setIsTestPromptOpen(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                                                        <button onClick={handleBulkGenerateTest} disabled={bulkLoading} style={{ padding: '10px 20px', backgroundColor: '#8b5cf6', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {bulkLoading ? 'Sending...' : '🚀 Send Tests'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <table className={styles.table} style={{marginTop: '0'}}>
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px' }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={jobCandidates.filter(c => (c.firstName + ' ' + c.lastName).toLowerCase().includes(candSearchTerm.toLowerCase())).length > 0 && selectedCandIds.length === jobCandidates.filter(c => (c.firstName + ' ' + c.lastName).toLowerCase().includes(candSearchTerm.toLowerCase())).length}
                                                        onChange={() => handleSelectAll(jobCandidates.filter(c => (c.firstName + ' ' + c.lastName).toLowerCase().includes(candSearchTerm.toLowerCase())))}
                                                    />
                                                </th>
                                                <th>CANDIDATE</th>
                                                <th>NLP SCORE</th>
                                                <th>ACTION</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {jobCandidates.filter(c => (c.firstName + ' ' + c.lastName).toLowerCase().includes(candSearchTerm.toLowerCase())).map(cand => (
                                                <tr key={cand.applicationId}>
                                                    <td>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedCandIds.includes(cand.applicationId)}
                                                            onChange={() => toggleCandidateSelection(cand.applicationId)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <strong>{cand.firstName} {cand.lastName}</strong><br/>
                                                        <span style={{fontSize: '12px', color: '#666'}}>{cand.email || 'No email'}</span>
                                                    </td>
                                                    <td>
                                                        <span style={{fontWeight: 'bold', color: cand.nlpMatchScore >= 75 ? '#20B2AA' : '#f39c12'}}>
                                                            %{cand.nlpMatchScore}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={styles.actionLink} onClick={() => navigate('/company/candidates')}>View in Pool</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Inline Styles for Modal
const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};
const modalContentStyle = {
    backgroundColor: '#fff', borderRadius: '12px', width: '800px', maxWidth: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
};
const modalHeaderStyle = {
    padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
};
const closeBtnStyle = {
    background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999'
};
const modalBodyStyle = {
    padding: '20px', overflowY: 'auto'
};
const actionBtnStyle = {
    border: 'none', padding: '10px 15px', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
};

export default CompanyJobs;
