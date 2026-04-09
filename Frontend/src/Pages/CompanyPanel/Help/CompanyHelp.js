import React, { useState } from 'react';

function CompanyHelp() {
    const [openIndex, setOpenIndex] = useState(null);

    const questions = [
        {
            q: "Yeni ilan nasıl oluşturulur?",
            a: 'Panel sayfasında veya İş İlanları sekmesinde bulunan "+ Yeni İlan Oluştur" butonuna tıklayarak pozisyon detaylarını girip ilanı hızlıca aktif edebilirsiniz.'
        },
        {
            q: "Adayları ve ilanları nasıl takip ederim?",
            a: 'İlgili ilana "İş İlanları" modülünden detaylarına basarak ("İlanı İncele") veya tüm platformdaki genel başvuruları görmek için "Aday Havuzu" menüsünden ulaşabilirsiniz. Gelen başvuruları farklı statülere (Reddedildi, Mülakata Davet vs.) taşıyabilirsiniz.'
        },
        {
            q: "AI Test nasıl oluşturulur ve gönderilir?",
            a: 'İş İlanları sayfasından İlanı İncele diyerek adayları listeleyin. Adayların başındaki kutucukları işaretleyip "Yetenek/AI Testi Ata" butonuna tıklayarak onlara konu belirterek (örneğin: C# Backend Mülakatı) AI tarafından sınav gönderilmesini sağlayabilirsiniz.'
        },
        {
            q: "NLP Skoru ve Eşleşme Yüzdesi ne anlama gelir?",
            a: 'Yapay Zeka (NLP) Skoru, ilandaki aranan nitelikler ile adayın sisteme yüklediği CV içerisindeki yetenek ve tecrübelerin anlamsal (semantic) eşleşme skorudur. %80 ve üzeri adaylar "Yüksek Uyum" olarak nitelendirilir ve daha verimli mülakatlar geçirmenize yardımcı olur.'
        },
        {
            q: "Adayı nasıl elerim veya reddederim?",
            a: 'Aday Havuzunda ilgili adayın detaylarını açtığınızda ekranda yer alan "Adayı Ele (Reddet)" butonu üzerinden adaylığı sonlandırabilirsiniz. Bu işlem, adayın başvuru durumunu REJECTED olarak güncelleyecektir.'
        }
    ];

    const toggleOpen = (idx) => {
        setOpenIndex(openIndex === idx ? null : idx);
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ color: '#2c3e50', marginBottom: '10px' }}>Şirket Paneli Yardım / SSS</h1>
            <p style={{ color: '#7f8c8d', marginBottom: '30px' }}>CV Nokta işveren panelinde işlemlerinizi nasıl yapabileceğiniz hakkında sıkça sorulan sorular.</p>
            
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
                <h3 style={{ margin: '0 0 10px 0', color: '#1d4ed8' }}>Hala Sorun Mu Yaşıyorsunuz?</h3>
                <p style={{ margin: 0, color: '#3b82f6' }}>Lütfen sistem yöneticilerimizle <a href="mailto:support@cvnokta.com" style={{fontWeight: 'bold', color: '#1e40af'}}>support@cvnokta.com</a> üzerinden iletişime geçin.</p>
            </div>
        </div>
    );
}

export default CompanyHelp;
