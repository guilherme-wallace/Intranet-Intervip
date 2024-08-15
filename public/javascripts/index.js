function template(strings, ...keys) {
    return (function(...values) {
      let dict = values[values.length - 1] || {};
      let result = [strings[0]];
      keys.forEach(function(key, i) {
        let value = Number.isInteger(key) ? values[key] : dict[key];
        result.push(value, strings[i + 1]);
      });
      return result.join('');
    });
}

function convertDateTime(dateTime) {
	if (dateTime) {
		let dateTimeParts = dateTime.split(/[- T : . Z]/);
		dateTimeParts.splice(7, 1);
		const dateObject = new Date(Date.UTC(...dateTimeParts));
		return dateObject.toLocaleDateString();
	}

	return " ";
}

function moneyFormatter(value) {
    const formatter = new Intl.NumberFormat('pt-br', {
        style: 'decimal',
        minimumFractionDigits: 2
    });

    return formatter.format(value);
}

function logError(error) {
  	return alert(`Não foi possível inserir este registro no banco de dados. Por favor reporte o seguinte erro ao suporte técnico:\n\n${error}`);
}

function makeId(length) {
	var result = '';
	var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var charactersLength = characters.length;

	for (var i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}

	return result;
}