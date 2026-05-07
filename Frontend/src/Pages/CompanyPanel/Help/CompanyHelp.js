import React, { useState } from 'react';
import CompanyChatbot from './CompanyChatbot';

function CompanyHelp() {
    const [openIndex, setOpenIndex] = useState(null);

    const questions = [
        {
            q: "Yeni bir iş ilanını nasıl oluştururum?",
            a: 'Panel sayfasında veya İş İlanları sekmesindeki "+ Yeni İlan Oluştur" butonuna tıklayın. Pozisyon detaylarını girin ve ilanı hızlıca aktif hale getirin.'
        },
        {
            q: "Adayları ve iş ilanlarını nasıl takip ederim?",
            a: '"İş İlanları" modülünden ilgili ilanın detaylarına ("İlanı İncele") tıklayarak veya "Aday Havuzu" menüsünden platformdaki tüm başvuruları görüntüleyebilirsiniz. Gelen başvuruları farklı statülere (Reddedildi, Mülakat Daveti vb.) taşıyabilirsiniz.'
        },
        {
            q: "Yapay Zeka Testini nasıl oluşturur ve gönderirim?",
            a: 'İş İlanları sayfasından "İlanı İncele"ye tıklayarak adayları listeleyin. Adayların yanındaki kutucukları işaretleyin ve bir konu belirterek (örn. C# Backend Mülakatı) yapay zeka destekli sınavlar göndermek için "Beceri/AI Testi Ata" butonuna tıklayın.'
        },
        {
            q: "NLP Skoru ve Eşleşme Yüzdesi ne anlama geliyor?",
            a: 'Yapay Zeka (NLP) Skoru, ilanda aranan nitelikler ile adayın yüklediği CV\'sindeki beceri ve deneyimler arasındaki anlamsal eşleşme skorudur. %80 ve üzeri adaylar "Yüksek Eşleşme" olarak sınıflandırılır ve daha verimli mülakatlar yapmanıza yardımcı olur.'
        },
        {
            q: "Bir adayı nasıl reddeder veya elerim?",
            a: 'Aday Havuzu\'ndan ilgili adayın detaylarını açtığınızda, ekrandaki "Adayı Reddet" butonu aracılığıyla adaylığı sonlandırabilirsiniz. Bu işlem adayın başvuru durumunu REDDEDİLDİ olarak güncelleyecektir.'
        }
    ];

    const toggleOpen = (idx) => {
        setOpenIndex(openIndex === idx ? null : idx);
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ color: '#2c3e50', marginBottom: '10px' }}>İşveren Asistanı & Yardım</h1>
            <p style={{ color: '#7f8c8d', marginBottom: '30px' }}>HR AI işveren panelinde işlemlerinizi nasıl yöneteceğinize dair sıkça sorulan sorular ve AI asistanı.</p>
            
            {/* AI Chatbot Component */}
            <CompanyChatbot />
            
            <h2 style={{ color: '#2c3e50', marginTop: '40px', marginBottom: '20px' }}>Sıkça Sorulan Sorular</h2>
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
                <h3 style={{ margin: '0 0 10px 0', color: '#1d4ed8' }}>Hâlâ Sorun mu Yaşıyorsunuz?</h3>
                <p style={{ margin: 0, color: '#3b82f6' }}>Lütfen sistem yöneticilerimizle iletişime geçin: <a href="mailto:support@hr.ai" style={{fontWeight: 'bold', color: '#1e40af'}}>support@hr.ai</a>.</p>
            </div>
        </div>
    );
}

export default CompanyHelp;
