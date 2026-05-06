import React, { useState } from 'react';
import styles from './Help.module.css';
import CareerChatbot from './CareerChatbot';

function Help() {
    const [openIndex, setOpenIndex] = useState(0);

    const faqs = [
        {
            title: 'How does the application process work?',
            content: (
                <>
                    <p>Our job application process is based on a fair, transparent, and talent-based evaluation. After applying for a job, the stages are generally as follows:</p>
                    <ul>
                        <li><strong>Resume Review:</strong> As soon as your application reaches the system, it is forwarded to our Human Resources (HR) department or the relevant position manager. Our HR specialists evaluate your application in detail according to the job requirements.</li>
                        <li><strong>Pre-Interview (Phone / Online):</strong> Candidates whose resumes are found favorable are contacted for a brief pre-interview. This stage focuses on your competencies, career goals, and expectations.</li>
                        <li><strong>Technical / Competency-Based Interviews:</strong> A more comprehensive interview conducted with relevant department managers. At this stage, your technical knowledge or role-specific competencies are evaluated. For some technical positions, a case study or test may be sent.</li>
                        <li><strong>Offer Stage:</strong> Candidates who successfully complete all stages receive an official job offer. Your hiring process begins with your approval.</li>
                    </ul>
                    <p>We will keep you informed at every stage throughout the process. You can track your application status in real-time from the "My Results" tab.</p>
                </>
            )
        },
        {
            title: 'How should you prepare your CV?',
            content: (
                <>
                    <p>An effective CV is your first impression on the path to your career goal. When preparing a successful CV, the following is recommended:</p>
                    <ul>
                        <li><strong>Be Brief and Concise:</strong> An ideal CV should generally consist of one or a maximum of two pages. Avoid unnecessary details or information unrelated to the position you are applying for.</li>
                        <li><strong>Be Achievement-Oriented:</strong> Instead of just writing about your daily tasks, highlight concrete achievements (supported by metrics). E.g.: "Increased sales by 20%".</li>
                        <li><strong>Up-to-date Contact Information:</strong> Make sure your phone number, professional email address, and LinkedIn profile link are correct.</li>
                        <li><strong>Readability:</strong> Stay away from visual clutter. List your information in reverse chronological order (from most recent experience to oldest). Use easy-to-read fonts.</li>
                        <li><strong>Keywords:</strong> Include important keywords and competencies from the job listing in your CV (especially in the skills or profile summary section).</li>
                    </ul>
                    <p>Filling in all required fields on the <strong>My Profile</strong> page in our system will help us automatically create an accurate draft of your CV for the jobs you apply for.</p>
                </>
            )
        },
        {
            title: 'How are application responses handled?',
            content: (
                <>
                    <p>Providing feedback to our candidates is one of the most important parts of the process for us.</p>
                    <p>When there is a development regarding your application, you will be notified through the following methods:</p>
                    <ul>
                        <li><strong>In-System Notifications:</strong> When your status in the candidate pool is updated (e.g., "Under Review", "Reviewed", or "Accepted"), you can see this status from the <strong>My Applications &gt; My Results</strong> page.</li>
                        <li><strong>Email:</strong> All results, whether positive or negative, are sent to your registered email address. Interview invitations are also delivered via email as calendar invites.</li>
                        <li><strong>Phone:</strong> Especially candidates who advance to further stages (Interview, etc.) are directly contacted by phone by our HR specialists.</li>
                    </ul>
                    <p>Generally, the initial evaluation of an application may take 1-2 weeks.</p>
                </>
            )
        },
        {
            title: 'Is adding a cover letter mandatory?',
            content: (
                <>
                    <p>A cover letter is <strong>not mandatory</strong> for most applications on our platform, but it is strongly recommended.</p>
                    <p>A well-written short cover letter:</p>
                    <ul>
                        <li>Highlights your motivation. It provides clues about why you want this position so much that are not in your CV.</li>
                        <li>Gives you the opportunity to talk about your future vision.</li>
                        <li>Helps us understand your fit with our company culture more quickly.</li>
                    </ul>
                    <p>You can save your cover letter as a general text under the "My Profile" tab or update it specifically for each application.</p>
                </>
            )
        }
    ];

    const toggleOpen = (index) => {
        setOpenIndex(openIndex === index ? -1 : index);
    };

    return (
        <div className={styles.helpContainer}>
            <div className={styles.header}>
                <div className={styles.headerIcon}>❓</div>
                <div className={styles.headerText}>
                    <h2>Career Help Center</h2>
                    <p>Find answers to all your questions about the job application process, CV preparation, and platform usage here.</p>
                </div>
            </div>

            {/* AI Career Assistant */}
            <CareerChatbot />

            <div className={styles.faqList}>
                {faqs.map((faq, index) => (
                    <div 
                        key={index} 
                        className={`${styles.faqItem} ${openIndex === index ? styles.open : ''}`}
                    >
                        <button 
                            className={styles.faqQuestion} 
                            onClick={() => toggleOpen(index)}
                        >
                            <span className={styles.questionText}>{faq.title}</span>
                            <span className={styles.icon}>{openIndex === index ? '−' : '+'}</span>
                        </button>
                        <div 
                            className={styles.faqAnswer}
                            style={{
                                maxHeight: openIndex === index ? '1000px' : '0',
                                opacity: openIndex === index ? 1 : 0
                            }}
                        >
                            <div className={styles.answerContent}>
                                {faq.content}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.contactSupport}>
                <h3>Need more help?</h3>
                <p>If you couldn't find the answer you were looking for, you can contact our support team directly.</p>
                <a href="mailto:support@hrai.com" className={styles.contactBtn}>Contact Support Team</a>
            </div>
        </div>
    );
}

export default Help;
