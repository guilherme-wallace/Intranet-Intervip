# /public/scriptsPy/migraOnus/main.py

import sys
from route.dadosConexaoOLTs import user, user_password
from public.currentPort import *
from public.jsonONUs import *
from public.autorizaONU import *
from public.autofind import *
from public.ontSummary import *


use_OLT_Antiga = sys.argv[1]
ip_OLT_Antiga = sys.argv[2] 
use_OLT_Nova = sys.argv[3]
ip_OLT_Nova = sys.argv[4]

pon_ANTIGA = sys.argv[5]
onu_ID = int(sys.argv[6])
ont_LIN_PROF = sys.argv[7] if sys.argv[7] != 'None' else None
ont_SRV_PROF = sys.argv[8] if sys.argv[8] != 'None' else None
ont_native_vlan = sys.argv[9] if sys.argv[9] != 'None' else None
ont_vlan_service_port = sys.argv[10] if sys.argv[10] != 'None' else None
ont_gem_PORT = sys.argv[11] if sys.argv[11] != 'None' else None
ont_user_vlan = sys.argv[12] if sys.argv[12] != 'None' else None


hostnameOLTAntiga = ip_OLT_Antiga
hostnameOLTNova = ip_OLT_Nova

username = user
password = user_password

caminho = '/opt/intranet/public/scriptsPy/migraOnus/src/'
#caminho = 'C:\\Users\\gui-wallace-not\\OneDrive\\Documentos\\GitHub\\Intranet-Intervip\\public\\scriptsPy\\migraOnus\\src\\'

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