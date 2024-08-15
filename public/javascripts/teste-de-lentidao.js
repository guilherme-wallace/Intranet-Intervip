$(function () {
	const textInput = document.getElementById('resultadoId');
    const copyButton = document.getElementById('copiarIdInfo');

	copyButton.addEventListener('click', ()=> {
		textInput.select();
		document.execCommand('copy');
	});
	$('#limparDados').on('click', function() { 
		location.reload()
	});

	$('#dropdownPeriodo a').on('click', function() {
        switch ($(this).text()) {
            case 'Qualquer período':
                $('#dropdownPeriodo').text($(this).text());
                break;
            case 'Manhã':
                $('#dropdownPeriodo').text($(this).text());
                break;
            case 'Tarde':
                $('#dropdownPeriodo').text($(this).text());
                break;
			case 'Noite':
				$('#dropdownPeriodo').text($(this).text());
				break;
        }
    });

    $('#dropdownMeioFisico a').on('click', function() {
        switch ($(this).text()) {
            case 'Wifi':
                $('#dropdownMeioFisico').text($(this).text());
				$('#local_clienteRow').attr('hidden', false);
				$('#freq_wifiRow').attr('hidden', false);
                break;
            case 'Cabo':
                $('#dropdownMeioFisico').text($(this).text());
				$('#local_clienteRow').attr('hidden', true);
				$('#freq_wifiRow').attr('hidden', true);
                break;
        }
    });

	$('#dropdownFreqWifi a').on('click', function() {
        switch ($(this).text()) {
            case '2.4GHz':
                $('#dropdownFreqWifi').text($(this).text());
                break;
            case '5.8GHz ou maior':
                $('#dropdownFreqWifi').text($(this).text());
                break;
        }
    });

    $('#dropdownPossuiRepetidor a').on('click', function() {
        switch ($(this).text()) {
            case 'Sim':
                $('#dropdownPossuiRepetidor').text($(this).text());
				$('#marcaModeloRepetidorRow').attr('hidden', false);
				$('#localRepetidorRow').attr('hidden', false);
				$('#obsRepetidorRow').attr('hidden', false);
                break;
            case 'Não':
                $('#dropdownPossuiRepetidor').text($(this).text());
				$('#marcaModeloRepetidorRow').attr('hidden', true);
				$('#localRepetidorRow').attr('hidden', true);
				$('#obsRepetidorRow').attr('hidden', true);
                break;
        }
    });
});
function controle() {
	let peridoSelecionado = $('#dropdownPeriodo').text();
	let dropdownMeioFisico = $('#dropdownMeioFisico').text();
	let dropdownFreqWifi = $('#dropdownFreqWifi').text();
	let dropdownPossuiRepetidor = $('#dropdownPossuiRepetidor').text();
	let marcaModeloRepetidor = $('#marcaModeloRepetidor').text();
	let localRepetidor = $('#localRepetidor').text();
	
	if (dropdownMeioFisico == "Selecione uma opção") {
		return alert("Favor selecionar por qual meio físio o teste foi realizado");
	}
	if (dropdownMeioFisico == "Wifi") {
		if (dropdownFreqWifi == "Selecione uma opção") {
			return alert("Favor selecionar a frênica da Wi-Fi em que o teste foi realizado");
		}else {
			frequenciaSelecionada = dropdownFreqWifi;
		}
	}
	else{
		frequenciaSelecionada = "Realizado o teste via Cabo";
	}

	if (dropdownPossuiRepetidor == "Não") {
		marcaModeloRepetidor = "Não possui repetidor";
		localRepetidor = "Não possui repetidor"
	}
	  var dados = 
		"-Formulário Teste de Lentidão-"
		+ "\nObservações: " + document.form_ivp.obs.value
	  	+ "\nNome do Cliente: " + document.form_ivp.nome_cliente.value
	    + "\nTelefone / Celular do cliente: " + document.form_ivp.telefone.value
	    + "\nPeríodo preferencial para retorno: " + peridoSelecionado
	    + "\nCliente deseja retorno pelo whatsapp: " + document.form_ivp.whatsapp.value
	    + "\nModelo do Roteador: " + document.form_ivp.mod_router.value
	    + "\nLocal de instalação do Roteador: " + document.form_ivp.loc_router.value
	    + "\nLocalização do Cliente durante o Teste: " + document.form_ivp.local_cliente.value
	    + "\nCliente possui repetidor: " + dropdownPossuiRepetidor
	    + "\nMarca e modelo do repetidor: " + marcaModeloRepetidor
	    + "\nLocal do repetidor: " + localRepetidor
	    + "\nMeio Físico: " + dropdownMeioFisico
	    + "\nFrequência WIFI: " + frequenciaSelecionada
	    + "\nSite do Teste: " + document.form_ivp.site_teste.value
	    + "\nResultado Download: " + document.form_ivp.resul_down.value
	    + "\nResultado Upload: " + document.form_ivp.resul_up.value
	    + "\nResultado Latência: " + document.form_ivp.resul_lat.value
	    + "\nQuantidade de Desktops/Notebooks: " + document.form_ivp.qte_desk.value
	    + "\nQuantidade de Smartphones: " + document.form_ivp.qte_smart.value
	    + "\nModelo e marca do equipamento testado: " + document.form_ivp.Smartphone_test.value
	    + "\nQuantidade de SmartTV: " + document.form_ivp.qte_tv.value
	    + "\nQuantidade de IPTV: " + document.form_ivp.qte_iptv.value


	  document.form_ivp.resultado.value = dados;
}

