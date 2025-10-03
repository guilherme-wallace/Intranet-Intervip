$(function () {		
	$('#geraInfo').on('click', function() {
        controle();
    });

	$('#qteRamais').on('focusout click', function () {
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

	$('#qteFilas').on('focusout click', function () {
		var qteFilas = document.querySelector("#qteFilas");
		var listRowNomeFila = [`
		<div class="row">
			<table class="table table-hover">
				<thead>
					<tr>
						<th scope="col" style="width: 55%;">Nome da Fila</th>
						<th scope="col">Ramais associados a essa fila</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<input type="text" maxlength="34" id="nomeIdFila1" name="nomeFila1" class="form-control form-control-sm center" placeholder="Financeiro" autocomplete="off">
						</td>
						<td>
							<input type="text" maxlength="60" id="ramaisIdXFila1" name="ramaisXFila1" class="form-control form-control-sm center" placeholder="Ramal - 1000. Ramal - 1001. Ramal - 1002" autocomplete="off">
						</td>
					</tr>
				</tbody>
			</table>
		</div>`];
	
		if (qteFilas.value > 0) {
			for (let i = 2; i <= qteFilas.value; i++) {
				let templateRowNomeFila = `
				<div class="row">
					<table class="table table-hover">
						<thead>
							<tr>
								<th scope="col" style="width: 55%;">Nome da Fila</th>
								<th scope="col">Ramais associados a essa fila</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>
									<input type="text" maxlength="34" id="nomeIdFila${i}" name="nomeFila${i}" class="form-control form-control-sm center" placeholder="Atendimento nível ${i-1}" autocomplete="off">
								</td>
								<td>
									<input type="text" maxlength="60" id="ramaisIdXFila${i}" name="ramaisXFila${i}" class="form-control form-control-sm center" placeholder="Ramal - 1003. Ramal - 1004. Ramal - 1005" autocomplete="off">
								</td>
							</tr>
						</tbody>
					</table>
				</div>`;
				listRowNomeFila.push(templateRowNomeFila);
			};
			document.getElementById("rowNomeFila").innerHTML = listRowNomeFila;
			let text = document.getElementById("rowNomeFila").innerHTML;
			document.getElementById("rowNomeFila").innerHTML = text.replaceAll(",", "");
		};
	
		$('#qteFilas').on('focusout', function () {
			if (qteFilas.value >= 1) {
				document.getElementById("bntFilaclick").click();
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
	//Controle Ramais ------------------------------
	let textRamal = document.getElementById("controlRowNomeRamal").innerHTML;
	let resultNome = (textRamal.match(/nomeIdRamal/g) || []).length;
	//let resultNumero = (textRamal.match(/numeroIdRamal/g) || []).length;
	var listNomeRamal = [];
	var listNumeroRamal = [];
	var listvalueNomeRamal = [];
	var listvalueNumeroRamal = [];

	//Nome e Número
	for (let i = 1; i <= resultNome; i++) {
		let strNomeRamal = `nomeIdRamal${i}`;
		listNomeRamal.push(strNomeRamal);
		let strNumeroRamal = `numeroIdRamal${i}`;
		listNumeroRamal.push(strNumeroRamal);
	};

	//NomeList
	for (let i = 0; i <= listNomeRamal.length -1; i++) {
		var auxNomeList = document.getElementById(listNomeRamal[i]);
		listvalueNomeRamal.push(" " + auxNomeList.value);
		var auxNumeroRamal = document.getElementById(listNumeroRamal[i]);
		listvalueNumeroRamal.push("\n" + "Nome do ramal: " + auxNomeList.value + "   Número: " + auxNumeroRamal.value);
	};

	//Verificações
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
	
	//Controle Filas ------------------------------

	let textFila = document.getElementById("controlRowNomeFila").innerHTML;
	let resultNomeFilas = (textFila.match(/nomeIdFila/g) || []).length;
	var listNomeFila = [];
	var listFilaxRamal = [];
	var listvalueNomeFila = [];
	var listvalueFilaxRamal = [];

	//NomeFilas
	for (let i = 1; i <= resultNomeFilas; i++) {
		let strNomeFila = `nomeIdFila${i}`;
		let strFilaxRamal = `ramaisIdXFila${i}`;
		listNomeFila.push(strNomeFila);
		listFilaxRamal.push(strFilaxRamal);
	};

	//NomeListFilas
	for (let i = 0; i <= listNomeFila.length -1; i++) {
		var valorFila = document.getElementById(listNomeFila[i]);
		listvalueNomeFila.push(" " + valorFila.value);
		var valorFilaxRamal = document.getElementById(listFilaxRamal[i]);
		listvalueFilaxRamal.push("\n" + (i+1) + "º" + "Fila: " + valorFila.value + ", possui os ramais: " + valorFilaxRamal.value);
	};

	//Verificações
	for (let i = 0; i < listvalueNomeFila.length ; i++) {
		if(listvalueNomeFila[i] == " ") {
			return alert("Favor verificar o nome das filas!");
		}
	}

	if(listvalueNomeFila == "") {
		return alert("Favor verificar se filas foram informadas!");
	}

	var dados = 
	"-Pedidos na Linha Telefônica URA-"
	+ "\nNome do Cliente: " + document.form_ivp.nome_cliente.value
	+ "\nTelefone / Celular do cliente: " + document.form_ivp.telefone.value
	+ "\nPeríodo preferencial para retorno: " + document.form_ivp.periodo.value
	+ "\nCliente deseja retorno pelo Whatsapp: " + document.form_ivp.whatsapp.value
	+ "\nQuantidade de ramais: " + document.form_ivp.qteRamais.value
	+ "\nNome e número dos ramais: " + listvalueNumeroRamal
	+ "\nNome dos Grupos/Setores/Filas: " + listvalueNomeFila
	+ "\nRamais e Filas:" + listvalueFilaxRamal
	+ "\nPortabilidade: " + portabilidadeData
	+ "\nNumero da portabilidade: " + numeroPortabilidadeData
	+ "\nMensagem que o cliente deseja ter na URA: " + document.form_ivp.mensagemURA.value
	
	document.form_ivp.resultado.value = dados;
}
