window.onload = function () {
    const data = JSON.parse(localStorage.getItem("devisData"));
    if (!data) {
        alert("Aucune donnée trouvée pour l'impression.");
        return;
    }

    // Infos générales
    document.getElementById("numero-devis").textContent = data.numeroDevis;
    document.getElementById("date-devis").textContent = data.dateDevis;

    // Info devis
    document.getElementById("regime-imposition").textContent = data.regime;
    document.getElementById("objet").textContent = data.objet;
    document.getElementById("article").textContent = data.article;
    document.getElementById("validite").textContent = data.validite;
    document.getElementById("condition").textContent = data.condition;
    document.getElementById("garantie").textContent = data.garantie;

    // Infos client
    document.getElementById("client-nom").textContent = data.clientName;
    document.getElementById("client-tel").textContent = data.telephone;
    document.getElementById("client-email").textContent = data.email;
    document.getElementById("client-bp").textContent = data.bp;
    document.getElementById("client-att").textContent = data.att;
    document.getElementById("client-cc").textContent = data.cc;

    // Insertion des articles (à partir de la 2e ligne du tableau)
    const lignes = document.querySelectorAll("#devis-lignes-articles tr");
    for (let i = 1; i < lignes.length && i - 1 < data.articles.length; i++) {
        const articleData = data.articles[i - 1];
        lignes[i].querySelector(".article").textContent = articleData.description;
        lignes[i].querySelector(".quantite").textContent = articleData.quantity;
        lignes[i].querySelector(".prix").textContent = articleData.price;
        lignes[i].querySelector(".total").textContent = articleData.total;
    }

    // Totaux
    const totalRow = document.querySelector("#devis-lignes-totaux tr");
    totalRow.querySelector(".Montant-th").textContent = data.montantHT.toFixed(2);
    totalRow.querySelector(".remise").textContent = data.remise + " %";
    totalRow.querySelector(".apres-remise").textContent = data.apresRemise.toFixed(2);
    totalRow.querySelector(".main-oeuvre").textContent = data.mainOeuvre.toFixed(2);
    totalRow.querySelector(".tva").textContent = data.tva + " %";
    totalRow.querySelector(".montant-ttc").textContent = data.montantTTC.toFixed(2);


    // impression du devis

setTimeout(async () => {
    const { jsPDF } = window.jspdf;
    const devisElement = document.getElementById("devis");

    // Alléger le rendu
    const canvas = await html2canvas(devisElement, { scale: 3 }); // Moins de pixels = fichier plus léger
    const imgData = canvas.toDataURL('image/jpeg', 0.85); // JPEG allégé

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfHeight = (imgProps.height * pageWidth) / imgProps.width;

    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pdfHeight);

    const nomPDF = `Devis${data.numeroDevis || '000'}.pdf`;
    pdf.save(nomPDF);

    setTimeout(() => window.close(), 500); // Fermeture plus rapide
}, 300); // Délai réduit



};
