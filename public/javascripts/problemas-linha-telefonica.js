$(function () {
	const textInput = document.getElementById('resultadoId');
    const copyButton = document.getElementById('copiarIdInfo');

	copyButton.addEventListener('click', ()=> {
		textInput.select();
		document.execCommand('copy');
	});

	
	var naoConsegueFazerLigação = document.querySelector('#naoConsegueFazerLigação')
	var qualProblema = "";

	$('#naoConsegueFazerLigação').on('click', function () {
		qualProblema = naoConsegueFazerLigação.id
		$("#naoConsegueFazerLigação").val("Não consegue fazer ligação");
		$("#qualProblemaAuxId").val("Não consegue fazer ligação");
        $('#rowNumeroComProblema').attr('hidden', false);
	});

	var naoConsegueRecebeLigação = document.querySelector('#naoConsegueRecebeLigação')
	$('#naoConsegueRecebeLigação').on('click', function () {
		qualProblema = naoConsegueRecebeLigação.id
		$("#naoConsegueRecebeLigação").val("Não consegue receber ligação");
		$("#qualProblemaAuxId").val("Não consegue receber ligação");
        $('#rowNumeroComProblema').attr('hidden', false);
	});

	var ligacaoPicotando = document.querySelector('#ligacaoPicotando')
	$('#ligacaoPicotando').on('click', function () {
		qualProblema = ligacaoPicotando.id
		$("#ligacaoPicotando").val("Ligação picotando");
		$("#qualProblemaAuxId").val("Ligação picotando");
        $('#rowNumeroComProblema').attr('hidden', true);
	});

	var ligacaoMuda = document.querySelector('#ligacaoMuda')
	$('#ligacaoMuda').on('click', function () {
		qualProblema = ligacaoMuda.id
		$("#ligacaoMuda").val("Ligação esta muda");
		$("#qualProblemaAuxId").val("Ligação esta muda");
        $('#rowNumeroComProblema').attr('hidden', true);
	});

	var vozRobotizada = document.querySelector('#vozRobotizada')
	$('#vozRobotizada').on('click', function () {
		qualProblema = vozRobotizada.id
		$("#vozRobotizada").val("Voz robotizada");
		$("#qualProblemaAuxId").val("Problema na Fila");
        $('#rowNumeroComProblema').attr('hidden', true);
	});

	var problemaUra = document.querySelector('#problemaUra')
	$('#problemaUra').on('click', function () {
		qualProblema = problemaUra.id
		$("#problemaUra").val("Problema na URA");
		$("#qualProblemaAuxId").val("Problema na Fila");
        $('#rowNumeroComProblema').attr('hidden', true);
	});

	var problemaFila = document.querySelector('#problemaFila')
	$('#problemaFila').on('click', function () {
		qualProblema = problemaFila.id
		$("#problemaFila").val("Problema na Fila");
		$("#qualProblemaAuxId").val("Problema na Fila");
        $('#rowNumeroComProblema').attr('hidden', true);
	});


});


function controle() {
	var qualProblemaAuxId = document.getElementById("qualProblemaAuxId");

	if (qualProblemaAuxId.value == "Não consegue fazer ligação" || qualProblemaAuxId.value == "Não consegue receber ligação") {
		var dados = 
		"-Formulário Problemas na Linha Telefônica-"
		+ "\nObservações: " + document.form_ivp.obs.value
		+ "\nNome do Cliente: " + document.form_ivp.nome_cliente.value
		+ "\nTelefone / Celular do cliente: " + document.form_ivp.telefone.value
		+ "\nPeríodo preferencial para retorno: " + document.form_ivp.periodo.value
		+ "\nCliente deseja retorno pelo whatsapp: " + document.form_ivp.whatsapp.value
		+ "\nRamal / Linha com problema: " + document.form_ivp.ramal_linha.value
		+ "\nProblema que ocorre: " + qualProblemaAuxId.value
		+ "\nNúmeros em que ocorre o problema: " + document.form_ivp.numeroComProblema.value
	}
	else {
		var dados = 
		"-Formulário Problemas na Linha Telefônica-"
		+ "\nObservações: " + document.form_ivp.obs.value
		+ "\nNome do Cliente: " + document.form_ivp.nome_cliente.value
		+ "\nTelefone / Celular do cliente: " + document.form_ivp.telefone.value
		+ "\nPeríodo preferencial para retorno: " + document.form_ivp.periodo.value
		+ "\nCliente deseja retorno pelo whatsapp: " + document.form_ivp.whatsapp.value
		+ "\nRamal / Linha com problema: " + document.form_ivp.ramal_linha.value
		+ "\nProblema que ocorre: " + qualProblemaAuxId.value
	};

	document.form_ivp.resultado.value = dados;
}

