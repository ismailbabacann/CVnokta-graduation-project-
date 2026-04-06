import React, { useState } from 'react';
import styles from './Help.module.css';

function Help() {
    const [openIndex, setOpenIndex] = useState(0);

    const faqs = [
        {
            title: 'Başvuru süreci nasıl ilerler?',
            content: (
                <>
                    <p>İş başvuru sürecimiz adil, şeffaf ve yetenek bazlı bir değerlendirme üzerine kuruludur. Bir ilana başvurduktan sonraki aşamalar genellikle şu şekildedir:</p>
                    <ul>
                        <li><strong>Özgeçmiş İncelemesi:</strong> Başvurunuz sisteme ulaştığı anda doğrudan İnsan Kaynakları (İK) departmanımıza veya ilgili pozisyon yöneticisine iletilir. İK uzmanlarımız başvurunuzu ilanın gerekliliklerine göre detaylı bir şekilde değerlendirir.</li>
                        <li><strong>Ön Görüşme (Telefon / Online):</strong> Özgeçmişi olumlu bulunan adaylar, kısa bir ön görüşme için aranır. Bu aşamada yetkinlikleriniz, kariyer hedefleriniz ve beklentileriniz üzerine odaklanılır.</li>
                        <li><strong>Teknik / Yetkinlik Bazlı Mülakatlar:</strong> İlgili departman yöneticileriyle yapılan daha kapsamlı bir görüşmedir. Bu aşamada teknik bilginiz veya role uygun yetkinlikleriniz değerlendirilir. Bazı teknik pozisyonlar için bir vaka çalışması (case study) veya test gönderilebilir.</li>
                        <li><strong>Teklif Aşaması:</strong> Tüm aşamaları başarıyla tamamlayan adaylara resmi bir iş teklifi sunulur. Onayınız ile birlikte işe alım süreciniz başlatılır.</li>
                    </ul>
                    <p>Tüm süreç boyunca her aşamada sizi bilgilendiriyor olacağız. Başvuru durumunuzu "Sonuçlarım" sekmesinden anlık olarak takip edebilirsiniz.</p>
                </>
            )
        },
        {
            title: 'Nasıl CV hazırlamalısın?',
            content: (
                <>
                    <p>Etkili bir CV, kariyer hedefinize giden yolda ilk izleniminizdir. Başarılı bir CV hazırlarken şunlara dikkat etmeniz önerilir:</p>
                    <ul>
                        <li><strong>Kısa ve Öz Olun:</strong> İdeal bir CV, genellikle bir veya maksimum iki sayfadan oluşmalıdır. Gereksiz veya başvurduğunuz pozisyonla ilgisiz detaylardan kaçının.</li>
                        <li><strong>Başarı Odaklı Olun:</strong> Yalnızca günlük görevlerinizi yazmak yerine, elde ettiğiniz somut başarıları (metriklerle destekleyerek) vurgulayın. Örn: "Satışları %20 artırdım".</li>
                        <li><strong>Güncel İletişim Bilgileri:</strong> Telefon numaranız, profesyonel bir e-posta adresiniz ve LinkedIn profil bağlantınızın doğru olduğundan emin olun.</li>
                        <li><strong>Okunabilirlik:</strong> Görsel karmaşadan uzak durun. Bilgilerinizi ters kronolojik sıra (en son deneyimden eskiye doğru) ile listeleyin. Okunması kolay yazı tipleri kullanın.</li>
                        <li><strong>Anahtar Kelimeler:</strong> İş ilanında yer alan önemli kelimeleri ve yetkinlikleri CV'nizde (özellikle yetenekler veya profil özeti bölümünde) barındırın.</li>
                    </ul>
                    <p>Sistemimizdeki <strong>Profilim</strong> sayfasında yer alan zorunlu alanları eksiksiz bir şekilde doldurmanız, başvuru yaptığınız ilanlarda otomatik olarak CV'nizin doğru bir taslağını oluşturmamıza yardımcı olacaktır.</p>
                </>
            )
        },
        {
            title: 'Başvuru dönüşleri nasıl yapılır?',
            content: (
                <>
                    <p>Adaylarımıza geri bildirim vermek, bizim için sürecin en önemli parçalarından biridir.</p>
                    <p>Başvurunuzla ilgili bir gelişme olduğunda şu yollarla bilgilendirilirsiniz:</p>
                    <ul>
                        <li><strong>Sistem İçi Bildirimler:</strong> Aday havuzunda durumunuz güncellendiğinde (Örn: "Değerlendirmede", "İncelendi", veya "Kabul Edildi") bu durumu <strong>Başvurduğum İlanlar > Sonuçlarım</strong> sayfasından görebilirsiniz.</li>
                        <li><strong>E-posta:</strong> Olumlu ya da olumsuz tüm sonuçlar kayıtlı e-posta adresinize gönderilir. Mülakat davetleri de yine e-posta yoluyla takvim daveti olarak iletilmektedir.</li>
                        <li><strong>Telefon:</strong> Özellikle ilerleyen aşamalara geçen (Mülakat vb.) adaylar, İK uzmanlarımız tarafından telefonla doğrudan aranarak bilgilendirilir.</li>
                    </ul>
                    <p>Genellikle bir ilana yapılan başvurunun ilk değerlendirme süreci 1-2 hafta sürebilmektedir.</p>
                </>
            )
        },
        {
            title: 'Önyazı eklemek zorunlu mu?',
            content: (
                <>
                    <p>Önyazı, platformumuzda başvuruların büyük bir bölümü için <strong>zorunlu tutulmamaktadır</strong>, ancak şiddetle tavsiye edilir.</p>
                    <p>Doğru yazılmış kısa bir önyazı:</p>
                    <ul>
                        <li>Motivasyonunuzu vurgular. CV'nizde yer almayan, o pozisyonu neden bu kadar çok istediğinize dair ipuçları verir.</li>
                        <li>Gelecek vizyonunuzdan bahsetme şansı tanır.</li>
                        <li>Şirket kültürümüze olan uygunluğunuzu daha hızlı anlamamıza yardımcı olur.</li>
                    </ul>
                    <p>Önyazınızı "Profilim" sekmesi altından genel bir metin olarak kaydedebilir ya da her başvuruya özel olarak güncelleyebilirsiniz.</p>
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
                    <p>İş başvuru süreci, CV hazırlama ve platform kullanımı ile ilgili aklınıza takılan tüm soruların cevaplarını burada bulabilirsiniz.</p>
                </div>
            </div>

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
                <a href="mailto:support@hrai.com" className={styles.contactBtn}>Destek Ekibine Ulaş</a>
            </div>
        </div>
    );
}

export default Help;
