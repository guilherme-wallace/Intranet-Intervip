$(function () {
	const textInput = document.getElementById('resultadoId');
    const copyButton = document.getElementById('copiarIdInfo');

	copyButton.addEventListener('click', ()=> {
		textInput.select();
		document.execCommand('copy');
	});
});
function controle() {

	  var dados = 
		"-Formulário Problemas em Sites e APPs-"
		+ "\nObservações: " + document.form_ivp.obs.value
	  	+ "\nNome do Cliente: " + document.form_ivp.nome_cliente.value
	    + "\nTelefone / Celular do cliente: " + document.form_ivp.telefone.value
	    + "\nPeríodo preferencial para retorno: " + document.form_ivp.periodo.value
	    + "\nCliente deseja retorno pelo whatsapp: " + document.form_ivp.whatsapp.value
	    + "\nIP de origem: " + document.form_ivp.ip_origem.value
	    + "\nAPP / Site informado: " + document.form_ivp.ip_url_app_de_acesso.value

	  document.form_ivp.resultado.value = dados;
}

