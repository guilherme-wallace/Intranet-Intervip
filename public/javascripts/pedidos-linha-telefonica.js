$(function () {	
	$('#geraInfo').on('click', function() {
        controle();
    });

	$('#qteRamais').on('focusout click', function (e) {
		var qteRamais = document.querySelector("#qteRamais");
		var listRowNomeRamal = [`
		<div class="row">
			<div class="col-sm-4">Nome e número do 1º ramal:</div>
			<div class="col-sm-4">
				<input type="text" maxlength="34" id="nomeIdRamal1" name="nomeRamal1" class="form-control form-control-sm center" placeholder="Administração" autocomplete="off">
			</div>
			<div class="col-sm-4">
				<input type="text" maxlength="4" id="numeroIdRamal1" name="numeroRamal1" class="form-control form-control-sm center" placeholder="1000" autocomplete="off">
			</div>
		</div><hr>`];

		if (qteRamais.value > 0) {
			for (let i = 2; i <= qteRamais.value; i++) {
				let templateRowNomeRamal = `
				<div class="row">
					<div class="col-sm-4">Nome e número do ${i}º ramal:</div>
					<div class="col-sm-4">
						<input type="text" maxlength="34" id="nomeIdRamal${i}" name="nomeRamal${i}" class="form-control form-control-sm center" placeholder="Sala ${i - 1}" autocomplete="off">
					</div>
					<div class="col-sm-4">
						<input type="text" maxlength="4" id="numeroIdRamal${i}" name="numeroRamal${i}" class="form-control form-control-sm center" placeholder="100${i - 1}" autocomplete="off">
					</div>
				</div><hr>`;

				listRowNomeRamal.push(templateRowNomeRamal);
			};
			document.getElementById("rowNomeRamal").innerHTML = listRowNomeRamal;
			let text = document.getElementById("rowNomeRamal").innerHTML;
			document.getElementById("rowNomeRamal").innerHTML = text.replaceAll(",", "");
		};

		$('#qteRamais').on('focusout', function () {
			if (qteRamais.value >= 1) {
				document.getElementById("bntRamalclick").click();
			}
		});
	});

	$('#portabilidadeBtnSim').on('click', function (e) {
		$("#portabilidade").val("Sim");
        $('#rowNumeroPortabilidade').attr('hidden', false);
	});
	$('#portabilidadeBtnNao').on('click', function (e) {
		$("#portabilidade").val("Não");
		$("#numeroPortabilidade").val("");
        $('#rowNumeroPortabilidade').attr('hidden', true);
	});
	$('#limparDados').on('click', function (e) {
		$("#portabilidade").val("Não");
		$("#numeroPortabilidade").val("");
        $('#rowNumeroPortabilidade').attr('hidden', true);
	});

	
	const textInput = document.getElementById('resultadoId');
	const copyButton = document.getElementById('copiarIdInfo');

	copyButton.addEventListener('click', ()=> {
		textInput.select();
		document.execCommand('copy');
	});
});

function controle() {
	let text = document.getElementById("controlRowNomeRamal").innerHTML;
	let resultNome = (text.match(/nomeIdRamal/g) || []).length;
	let resultNumero = (text.match(/numeroIdRamal/g) || []).length;
	var listNomeRamal = [];
	var listNumeroRamal = [];
	var listvalueNomeRamal = [];
	var listvalueNumeroRamal = [];

	//Nome
	for (let i = 1; i <= resultNome; i++) {
		let strNomeRamal = `nomeIdRamal${i}`;
		listNomeRamal.push(strNomeRamal);
	};

	//Numero
	for (let i = 1; i <= resultNumero; i++) {
		let strNumeroRamal = `numeroIdRamal${i}`;
		listNumeroRamal.push(strNumeroRamal);
	};

	//NomeList
	for (let i = 0; i <= listNomeRamal.length -1; i++) {
		var aux = document.getElementById(listNomeRamal[i]);
		listvalueNomeRamal.push(" " + aux.value);
	};

	//NumeroList
	for (let i = 0; i <= listNumeroRamal.length -1; i++) {
		var aux = document.getElementById(listNumeroRamal[i]);
		listvalueNumeroRamal.push(" " + aux.value);
	};

	var portabilidadeData = document.form_ivp.portabilidade.value
	var numeroPortabilidadeData = document.form_ivp.numeroPortabilidade.value
	
	if((numeroPortabilidadeData == "") && (portabilidadeData == "Sim")) {
		return alert("Favor informar o número portado!");
	}else if(portabilidadeData == "Não") {
		numeroPortabilidadeData = "Não há portabilidade"
	};

	for (let i = 0; i < listvalueNomeRamal.length ; i++) {
		if(listvalueNomeRamal[i] == " ") {
			return alert("Favor verificar o nome dos ramais!");
		}
	}
	
	for (let i = 0; i < listvalueNumeroRamal.length ; i++) {
		if(listvalueNumeroRamal[i] == " ") {
			return alert("Favor verificar o número dos ramais!");
		}
	}

	if((listvalueNumeroRamal == "") || listvalueNomeRamal == "") {
		return alert("Favor verificar se ramais foram informados!");
	}

	var dados = 
	"-Pedidos na Linha Telefônica-"
	+ "\nNome do Cliente: " + document.form_ivp.nome_cliente.value
	+ "\nTelefone / Celular do cliente: " + document.form_ivp.telefone.value
	+ "\nPeríodo preferencial para retorno: " + document.form_ivp.periodo.value
	+ "\nCliente deseja retorno pelo Whatsapp: " + document.form_ivp.whatsapp.value
	+ "\nQuantidade de ramais: " + document.form_ivp.qteRamais.value
	+ "\nNomes dos ramais: " + listvalueNomeRamal
	+ "\nNúmeros dos ramais: " + listvalueNumeroRamal
	+ "\nPortabilidade: " + portabilidadeData
	+ "\nNumero da portabilidade: " + numeroPortabilidadeData
	
	document.form_ivp.resultado.value = dados;
}
