import React, { useState } from 'react';
import styles from './Help.module.css';
import CareerChatbot from './CareerChatbot';

function Help() {
    const [openIndex, setOpenIndex] = useState(0);

    const faqs = [
        {
            title: 'Başvuru süreci nasıl işliyor?',
            content: (
                <>
                    <p>İş başvuru sürecimiz adil, şeffaf ve yetenek bazlı bir değerlendirmeye dayanır. Bir işe başvurduktan sonraki aşamalar genel olarak şöyledir:</p>
                    <ul>
                        <li><strong>Özgeçmiş İncelemesi:</strong> Başvurunuz sisteme ulaştığı anda İnsan Kaynakları (İK) departmanımıza veya ilgili pozisyon yöneticisine iletilir. İK uzmanlarımız başvurunuzu işin gerekliliklerine göre detaylı olarak inceler.</li>
                        <li><strong>Ön Görüşme (Telefon / Online):</strong> Özgeçmişi uygun bulunan adaylarla kısa bir ön görüşme için iletişime geçilir. Bu aşamada yetkinliklerinize, kariyer hedeflerinize ve beklentilerinize odaklanılır.</li>
                        <li><strong>Teknik / Yetkinlik Bazlı Mülakatlar:</strong> İlgili departman yöneticileriyle gerçekleştirilen daha kapsamlı bir mülakattır. Bu aşamada teknik bilginiz veya role özgü yetkinlikleriniz değerlendirilir. Bazı teknik pozisyonlar için vaka çalışması (case study) veya test gönderilebilir.</li>
                        <li><strong>Teklif Aşaması:</strong> Tüm aşamaları başarıyla tamamlayan adaylara resmi bir iş teklifi sunulur. Onayınızla birlikte işe alım süreciniz başlar.</li>
                    </ul>
                    <p>Süreç boyunca sizi her aşamada bilgilendireceğiz. Başvuru durumunuzu gerçek zamanlı olarak "Sonuçlarım" sekmesinden takip edebilirsiniz.</p>
                </>
            )
        },
        {
            title: 'Özgeçmişinizi (CV) nasıl hazırlamalısınız?',
            content: (
                <>
                    <p>Etkili bir CV, kariyer hedefinize giden yolda ilk izleniminizdir. Başarılı bir CV hazırlarken aşağıdakilere dikkat etmeniz önerilir:</p>
                    <ul>
                        <li><strong>Kısa ve Öz Olun:</strong> İdeal bir CV genellikle bir veya en fazla iki sayfadan oluşmalıdır. Başvurduğunuz pozisyonla ilgisi olmayan gereksiz detaylardan veya bilgilerden kaçının.</li>
                        <li><strong>Başarı Odaklı Olun:</strong> Sadece günlük görevlerinizi yazmak yerine somut başarılarınızı (metriklerle destekleyerek) öne çıkarın. Örn: "Satışları %20 artırdım".</li>
                        <li><strong>Güncel İletişim Bilgileri:</strong> Telefon numaranızın, profesyonel e-posta adresinizin ve LinkedIn profil bağlantınızın doğru olduğundan emin olun.</li>
                        <li><strong>Okunabilirlik:</strong> Görsel karmaşadan uzak durun. Bilgilerinizi ters kronolojik sırayla (en son deneyimden en eskiye doğru) listeleyin. Okunması kolay yazı tipleri kullanın.</li>
                        <li><strong>Anahtar Kelimeler:</strong> İş ilanında yer alan önemli anahtar kelimeleri ve yetkinlikleri CV'nize (özellikle beceriler veya profil özeti kısmına) dahil edin.</li>
                    </ul>
                    <p>Sistemimizdeki <strong>Profilim</strong> sayfasında yer alan tüm zorunlu alanları doldurmanız, başvurduğunuz işler için CV'nizin doğru bir taslağını otomatik olarak oluşturmamıza yardımcı olacaktır.</p>
                </>
            )
        },
        {
            title: 'Başvuru geri dönüşleri nasıl sağlanıyor?',
            content: (
                <>
                    <p>Adaylarımıza geri bildirim vermek, süreçteki en önemli unsurlardan biridir.</p>
                    <p>Başvurunuzla ilgili bir gelişme olduğunda aşağıdaki yöntemlerle bilgilendirileceksiniz:</p>
                    <ul>
                        <li><strong>Sistem İçi Bildirimler:</strong> Aday havuzundaki durumunuz güncellendiğinde (örneğin "İnceleniyor", "İncelendi" veya "Kabul Edildi"), bu durumu <strong>Başvurularım &gt; Sonuçlarım</strong> sayfasından görebilirsiniz.</li>
                        <li><strong>E-posta:</strong> Olumlu veya olumsuz tüm sonuçlar kayıtlı e-posta adresinize gönderilir. Mülakat davetleri de takvim daveti olarak e-posta aracılığıyla iletilir.</li>
                        <li><strong>Telefon:</strong> Özellikle ileriki aşamalara (Mülakat vb.) geçen adaylarla İK uzmanlarımız tarafından doğrudan telefonla iletişime geçilir.</li>
                    </ul>
                    <p>Bir başvurunun ilk değerlendirmesi genellikle 1-2 hafta sürebilir.</p>
                </>
            )
        },
        {
            title: 'Ön yazı (Cover Letter) eklemek zorunlu mu?',
            content: (
                <>
                    <p>Platformumuzdaki çoğu başvuru için ön yazı eklemek <strong>zorunlu değildir</strong>, ancak şiddetle tavsiye edilir.</p>
                    <p>İyi yazılmış kısa bir ön yazı:</p>
                    <ul>
                        <li>Motivasyonunuzu vurgular. CV'nizde yer almayan, bu pozisyonu neden bu kadar çok istediğinize dair ipuçları verir.</li>
                        <li>Gelecek vizyonunuzdan bahsetme fırsatı sunar.</li>
                        <li>Şirket kültürümüzle ne kadar uyumlu olduğunuzu daha hızlı anlamamıza yardımcı olur.</li>
                    </ul>
                    <p>Ön yazınızı "Profilim" sekmesi altında genel bir metin olarak kaydedebilir veya her başvuru için özel olarak güncelleyebilirsiniz.</p>
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
                    <h2>Kariyer Yardım Merkezi</h2>
                    <p>İş başvuru süreci, CV hazırlama ve platform kullanımı hakkındaki tüm sorularınızın cevaplarını burada bulabilirsiniz.</p>
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
                <h3>Daha fazla yardıma mı ihtiyacınız var?</h3>
                <p>Aradığınız cevabı bulamadıysanız, destek ekibimizle doğrudan iletişime geçebilirsiniz.</p>
                <a href="mailto:support@hrai.com" className={styles.contactBtn}>Destek Ekibiyle İletişime Geç</a>
            </div>
        </div>
    );
}

export default Help;
