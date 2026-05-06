import React, { useState } from 'react';
import CompanyChatbot from './CompanyChatbot';

function CompanyHelp() {
    const [openIndex, setOpenIndex] = useState(null);

    const questions = [
        {
            q: "How do I create a new job posting?",
            a: 'Click the "+ Create New Posting" button on the panel page or in the Job Postings tab. Enter the position details and quickly activate the posting.'
        },
        {
            q: "How do I track candidates and job postings?",
            a: 'You can access the relevant posting from the "Job Postings" module by clicking its details ("Review Posting"), or view all platform applications from the "Candidate Pool" menu. You can move incoming applications to different statuses (Rejected, Interview Invite, etc.).'
        },
        {
            q: "How do I create and send an AI Test?",
            a: 'From the Job Postings page, click "Review Posting" to list candidates. Check the boxes next to candidates and click the "Assign Skills/AI Test" button to send AI-generated exams by specifying a topic (e.g., C# Backend Interview).'
        },
        {
            q: "What does the NLP Score and Match Percentage mean?",
            a: 'The AI (NLP) Score is the semantic match score between the qualifications sought in the posting and the skills and experiences in the candidate\'s uploaded CV. Candidates with 80% and above are classified as "High Match" and help you conduct more efficient interviews.'
        },
        {
            q: "How do I reject or eliminate a candidate?",
            a: 'When you open the details of the relevant candidate in the Candidate Pool, you can terminate the candidacy via the "Reject Candidate" button on the screen. This action will update the candidate\'s application status to REJECTED.'
        }
    ];

    const toggleOpen = (idx) => {
        setOpenIndex(openIndex === idx ? null : idx);
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ color: '#2c3e50', marginBottom: '10px' }}>Employer Assistant & Help</h1>
            <p style={{ color: '#7f8c8d', marginBottom: '30px' }}>FAQs about how to manage your operations in the hr.ai employer panel, along with the AI assistant.</p>
            
            {/* AI Chatbot Component */}
            <CompanyChatbot />
            
            <h2 style={{ color: '#2c3e50', marginTop: '40px', marginBottom: '20px' }}>Frequently Asked Questions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {questions.map((item, idx) => (
                    <div key={idx} style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <div 
                            onClick={() => toggleOpen(idx)}
                            style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: openIndex === idx ? '#f8fafc' : '#fff', fontWeight: 'bold', color: '#1e293b' }}
                        >
                            <span>{item.q}</span>
                            <span>{openIndex === idx ? '▲' : '▼'}</span>
                        </div>
                        {openIndex === idx && (
                            <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', color: '#475569', lineHeight: '1.6' }}>
                                {item.a}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '40px', padding: '20px', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#1d4ed8' }}>Still Having Issues?</h3>
                <p style={{ margin: 0, color: '#3b82f6' }}>Please contact our system administrators at <a href="mailto:support@hr.ai" style={{fontWeight: 'bold', color: '#1e40af'}}>support@hr.ai</a>.</p>
            </div>
        </div>
    );
}

export default CompanyHelp;
