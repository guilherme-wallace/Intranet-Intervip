import sys
from route.dadosConexaoOLTs import *
from public.currentPort import *
from public.jsonONUs import *
from public.autorizaONU import *
from public.autofind import *
from public.ontSummary import *

# Selecione a OLT Antiga
#use_OLT_Antiga = "OLT-SEA01"
#pon_ANTIGA = "0/16/5"

# Selecione a OLT Nova
#use_OLT_Nova = "OLT-SEA01"

# Verifique as configurações das ONUs
# Deixew como None as configurações que não serão alteradas.

#onu_ID = 0
#ont_LIN_PROF = None
#ont_SRV_PROF = None
#ont_native_vlan = None
#ont_vlan_service_port = None
#ont_gem_PORT = None
#ont_user_vlan = None

# Command-line arguments passed from Node.js
use_OLT_Antiga = sys.argv[1]
use_OLT_Nova = sys.argv[2]
pon_ANTIGA = sys.argv[3]
onu_ID = int(sys.argv[4])
ont_LIN_PROF = sys.argv[5] if sys.argv[5] != 'None' else None
ont_SRV_PROF = sys.argv[6] if sys.argv[6] != 'None' else None
ont_native_vlan = sys.argv[7] if sys.argv[7] != 'None' else None
ont_vlan_service_port = sys.argv[8] if sys.argv[8] != 'None' else None
ont_gem_PORT = sys.argv[9] if sys.argv[9] != 'None' else None
ont_user_vlan = sys.argv[10] if sys.argv[10] != 'None' else None

# Mapeamento das OLTs e seus IPs
olt_IPS = {
    "SEA01-OLT-01-INTERVIP": ip_SEA01,
    "SEA03-OLT-01-VNC": ip_SEA03,
    "SEA04-OLT-01-LAR": ip_SEA04,
    "SEA05-OLT-01-NHZ": ip_SEA05,
    "VTA01-OLT-01-NEWPORT": ip_VTA01,
    "VTA02-OLT-01-JDCB": ip_VTA02,
    "VVA01-OLT-01-WLTS": ip_VVA01,
    "VVA03-OLT-01-ARIB": ip_VVA03,
    "CCA01-OLT-01-VCGB": ip_CCA01,
}

hostnameOLTAntiga = olt_IPS.get(use_OLT_Antiga)
hostnameOLTNova = olt_IPS.get(use_OLT_Nova)

username = user
password = user_password

caminho = '/opt/intranet/public/scriptsPy/migraOnus/src/'
#caminho = 'C:\Users\Guilherme Costa\Documents\GitHub\Intranet-Intervip\public\scriptsPy\migraOnus\src'

# Caminhos dos arquivos
full_currentPort_path =f'{caminho}full_currentPort.txt'
filtered_currentPort_path = f'{caminho}filtered_currentPort.txt'
onus_config_path = f'{caminho}onus_config.json'
autofind_onus_json_path = f'{caminho}autofind_onus.json'
autofind_onus_file = f'{caminho}autofind_onus.json'
onus_config_file = f'{caminho}onus_config.json'
ontSummary_path = f'{caminho}ontSummary.json'
ontDelete_path = f'{caminho}ontDelete.txt'
ontDeleteExcecao_path = f'{caminho}ontDeleteExcecao.txt'
autorizaONU_path = f'{caminho}autorizaONU.txt'
autorizaONUExcecao_path = f'{caminho}autorizaONUExcecao.txt'
onus_config_file = f'{caminho}onus_config.json'
autofind_onus_path = f'{caminho}autofind_onus.json'

def main():
    # Executa a função PEGA O CURRENTPORT
    ssh_connect_and_execute_currentPort(full_currentPort_path, filtered_currentPort_path, hostnameOLTAntiga, username, password, pon_ANTIGA)

    # Executando a função para criar o JSON
    json_onus_config(filtered_currentPort_path, onus_config_path)

    # Executando a função para buscar as ONUS para serem autorizadas
    ssh_connect_and_execute_autofind(autofind_onus_json_path, hostnameOLTNova, username, password)

    # Executando a função para buscar summary das ONUs que serão autorizadas
    ssh_connect_and_execute_summary(ontSummary_path, hostnameOLTNova, username, password, autofind_onus_file, onus_config_file)

    # Executando a função para criar os comando de autorizar ONUs    
    authorize_onus(ontSummary_path, onus_config_file, ontDelete_path, ontDeleteExcecao_path, autofind_onus_path, autorizaONU_path, autorizaONUExcecao_path, pon_ANTIGA, start_id=onu_ID, lineprofile_id=ont_LIN_PROF, 
                   srvprofile_id=ont_SRV_PROF, native_vlan=ont_native_vlan, service_port_id=None, vlan=ont_vlan_service_port, gemport=ont_gem_PORT, user_vlan=ont_user_vlan)

main()
