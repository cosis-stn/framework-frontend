'use strict';

//método criado para carregar manualmente o AngularJS
//Após o carregamento da página o sistema irá redirecionar para a tela de login
//caso não queira utilizar autenticação, é possóvel manter o bloco, retirando todo o seu conteúdo e mantendo apenas a linha:
angular.element(document).ready(function () {
    //desabilita o cache
    $.ajaxSetup({
        xhrFields: {
            withCredentials: true
        }
    });
    $.get(URL_SISTEMA + '/rest/Usuario', function (data) {
        if (data.name === undefined) {

            sessionStorage.removeItem('ngStorage-usuario');
            sessionStorage.removeItem('ngStorage-usuarioPerfil');

            window.location = URL_SISTEMA + '/';
        } else {
            angular.bootstrap(angular.element(document), ['BSTNApp']);
        }
    }).fail(function () {        
        window.location = URL_SISTEMA + '/';
    });
});

angular.module('stn-framework-frontend',[])

/*//////////////////////////CONFIG///////////////////////////// */
.config(['$httpProvider', function($httpProvider) {
    $httpProvider.interceptors.push(function($q) {
        return {
            'responseError': function(rejection){
                var defer = $q.defer();
							
                if(rejection.status == 401){
					
                }
                defer.reject(rejection);
                return defer.promise;
            }
        };
    });

}])
.config(function($provide) {
    $provide.decorator("$exceptionHandler", function($delegate,$injector) {		
		return function(exception, cause) {			
           if (exception.message.indexOf("Error in resource configuration for action `query`. Expected response to contain an array but got an object") > -1){				
				var stateService = $injector.get('$state');
				localStorage.usuario = JSON.stringify({});
				localStorage.usuarioPerfil = "";
				localStorage.logado = false;	
				localStorage.perfilSet = undefined;			
				stateService.go('login');
		   }
		   else{
			$delegate(exception, cause);			
		   }
		   
		};
	});
})
.config(['ngDialogProvider', function (ngDialogProvider) {
    ngDialogProvider.setDefaults({
          disableAnimation : false
    });
}])
.run(function ($rootScope, $location,perfilSvc ) {
	//checa o login a cada mudança de página
	$rootScope.next = '';
	$rootScope.$on('$locationChangeStart', function(data,next ) {			
		$rootScope.next = next;
		perfilSvc.checarLogin();		
	});
})

.run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/popover/popover.html",
      "<div class=\"popover {{placement}}\" ng-class=\"{ in: isOpen(), fade: animation() }\">\n" +
      "  <div class=\"arrow\"></div>\n" +
      "\n" +
      "  <div class=\"popover-inner\">\n" +
      "      <h3 class=\"popover-title\" ng-bind-html=\"title | unsafe\" ng-show=\"title\"></h3>\n" +
      "      <div class=\"popover-content\"ng-bind-html=\"content | unsafe\"></div>\n" +
      "  </div>\n" +
      "</div>\n" +
      "");
}])
.run(function () {   
	//configurações do gridview
    TrNgGrid.tableCssClass = 'tr-ng-grid table table-striped table-hover';
	var defaultTranslation = {};
    var ptbrTranslation = angular.extend({}, defaultTranslation, 
        {
        'Born': 'Born',
        'Search': 'Buscar',
        'Page':'Página',
        'First Page': 'Primeira Página',
        'Next Page': 'Próxima Página',
        'Previous Page': 'Página Anterior',
        'Last Page': 'Última Página',
        'Sort': 'Ordenar',
        'No items to display': 'Nenhum item a ser exibido',
        'displayed': 'exibido(s)',
        'in total': 'no total'
        });
    TrNgGrid.translations['pt-br'] = ptbrTranslation;
})
.config(['$httpProvider', function($httpProvider) {
	$httpProvider.defaults.withCredentials = true;
	$httpProvider.defaults.headers['delete'] = {
	  'Content-Type': 'application/json;charset=utf-8'
	};
  }])

/*//////////////////////////FACTORIES///////////////////////////// */
    .factory('LoginSvc', function($resource){ 
	return $resource(URL_SISTEMA +'/rest/Usuario');
	})  
	.factory('logoutSvc', function($resource){ //servico para logout
		return $resource(URL_SISTEMA +'/rest/Usuario/Sair'  );
	})
	.factory('authFactory', function(metaFactory,$route){
		var objAuth = {};
		var permissoesTela = [];
		
		objAuth.ajustarPagina = function(escopo){
			
			escopo.matrixPermissoes = [];
		
			metaFactory['restPermissaoPerfilPorUsuarioSvc'].query(function(data) {		
				
				angular.forEach(data, function(value) {
				
					if (value.nomeClasse == $route.current.$$route.classeImplementacao
						&& value.nomePerfil==localStorage.usuarioPerfil) {					
						permissoesTela[value.nomeMetodo] = value.ativo;
					}
				});
				
				
				escopo.matrixPermissoes = permissoesTela;			
	
			});
		};
		
		objAuth.prepararChecarAcessoLink = function (escopo) {
			var acessoLink = [];		
			var mostrarBuscaAvancada = false;
			metaFactory['restPermissaoPerfilPorUsuarioSvc'].query(
				function(data) {
					angular.forEach($route.routes,function(valueRota) {					
						angular.forEach(data,function(valuePerm){
							if (valuePerm.nomeAmigavel == "Busca Avançada")
								mostrarBuscaAvancada = valuePerm.ativo;
								
							if (valuePerm.nomeClasse == valueRota.classeImplementacao
								&& valuePerm.nomePerfil == localStorage.usuarioPerfil
								&& valuePerm.ativo == true) {
								acessoLink[valueRota.originalPath]=true;
							}
						});
					});
					//solução de contorno parao menu busca avançada não aparecer para quem não é autorizado
					acessoLink["/Chamado/buscaChamados"]=mostrarBuscaAvancada;
					escopo.acessoLink = acessoLink;
				}
			);
		}
		
		return objAuth;
	})
	.factory('crudService', function(metaFactory, ngDialog, toastr,  $rootScope, ajudaSvc, $location,utilsSvc) {
		var _obj = {};
		var templateDetalhar;
		var _scope;
		
		_obj.prepararCrudService = function(escopo) {
			_scope = escopo;
			_scope.modalCriar = function(){_obj.modalCriar()}; 
			_scope.modalAtualizar = function(id) {_obj.modalAtualizar(id)};
			_scope.modalConfirmarRemover = function(id) {_obj.modalConfirmarRemover(id)};
			_scope.criar = function() {_obj.criar()};
			_scope.lerUm = function(id) {_obj.lerUm(id)};
			_scope.lerTodos = function(){_obj.lerTodos()};
			_scope.atualizar = function() {_obj.atualizar()};
			_scope.remover = function(id) {_obj.remover(id)};
			_scope.salvar = function() {_obj.salvar()};
			
			// Array de linhas selecionadas. usado para as teclas de atalho.
			_scope.linhasSelecionadas = [];
			
			
		}
		
		// Abre a modal para criar novo item.
		_obj.modalCriar = function(large) {
			_scope.obj = {};
			ajudaSvc.templateModal = _obj.templateInserir;
			
			if (large !== undefined) {
				ngDialog.open({
					template: _obj.templateInserir,
					scope: _scope,
					className: 'ngdialog-theme-default ngdialog-large'
				});
			} else {
				ngDialog.open({
					template: _obj.templateInserir,
					scope: _scope
				});
			}
		};
		
		// Abre modal para atualizar item existente.
		_obj.modalAtualizar = function(id, large) {
			metaFactory[_obj.factory].get({ id: id }, function(dataModalEditar) {
				_scope.obj = dataModalEditar;
				
				//função que permite a execução de métodos após o carregamento da modal
				try{
					_scope.postModalEditar();
				} catch(err) {				
				}
				
				ajudaSvc.templateModal = _obj.templateEditar;
				if (large !== undefined) {
					ngDialog.open({
						template: _obj.templateEditar,
						scope: _scope,
						className: 'ngdialog-theme-default ngdialog-large'
					});
				} else {
					ngDialog.open({
						template: _obj.templateEditar,
						scope: _scope
					});
				}
			}, function() {
				toastr.error('Erro ao buscar objeto.');
			});
		};
	
		// Abre a modal de remoção de item.
		_obj.modalConfirmarRemover = function(id) {
			ngDialog.openConfirm({
				template: '<legend class=topo-modal>Confirmar exclusão</legend>\t\t\t\t<p>Tem certeza que deseja remover esse item?</p>\t\t\t\t<div class="ngdialog-buttons">\t\t\t\t\t<button type="button" class="ngdialog-button btn-primary" ng-click="closeThisDialog(0)">N\xE3o</button>\t\t\t\t\t<button type="button" class="ngdialog-button  btn-danger" auto-focus=true ng-click="confirm(1)">Sim</button>\t\t\t\t</div>',
				plain: true
			}).then(function() {
				_scope.remover(id);
			}, function() {
				toastr.info('Item n\xE3o removido.');
			});
		};
		
		// Insere um novo item.
		_obj.criar = function() {
			metaFactory[_obj.factory].save(_scope.obj, function(data) {			
				utilsSvc.tratarResposta(data);			
				ngDialog.closeAll();
				_scope.lerTodos();
				
	
			}, function(data){utilsSvc.tratarErro(data)})
			
		};
		
		_obj.lerUm = function(obj, large) {
			metaFactory[_obj.factory].get({id: obj.id}, function(data) {
				_scope.obj = data;
				ajudaSvc.templateModal = _obj.templateDetalhar;
				
				//efetua a leitura do registro de auditoria
				metaFactory[_obj.factory+'Auditoria'].get({id: obj.id}, function(dataAuditoria) {				
					_scope.obj.logAuditoria = dataAuditoria;
				
					if (large !== undefined) {
						ngDialog.open({
							template: _obj.templateDetalhar,
							scope: _scope,
							closeByEscape: false,
							className: 'ngdialog-theme-default ngdialog-large'
						});
					} else {
						ngDialog.open({
							template: _obj.templateDetalhar,
							scope: _scope
						});
					}
				});
			}, function() {
				toastr.error('Erro ao buscar dados.');
			});
		};
	
		_obj.lerTodos = function() {
			var ordenacao = '';
			if (_obj.ordenado==true){
				ordenacao='Ordenado';
			}
			metaFactory[_obj.factory+ordenacao].query(function(data) {
				_scope.dadosGrid = data;
				if (data.length === 0) {
					toastr.info('N\xE3o h\xE1 registros cadastrados.');
					$('dadosGrid').hide();
				} else {
					$('dadosGrid').show();
				}
			}, function() {
				toastr.error('erro ao buscar registros.');
			});
		};
	
		_obj.atualizar = function() {
			metaFactory[_obj.factory].update(_scope.obj, function() {
				toastr.success('Registro atualizado com sucesso.');
				ngDialog.closeAll();
				_scope.lerTodos();
				
				// Mudando o location no caso do serviço, já que não tem modal.
				if (_obj.factory === 'restServicoSvc'){
					$location.path('/Servico/');
				}
			}, function(data){utilsSvc.tratarErro(data)});
		};
		
		_obj.remover = function(id) {
			_scope.obj.id = id;
			
			metaFactory[_obj.factory].remove(_scope.obj, function() {
				toastr.success('Registro removido com sucesso.');
				_scope.lerTodos();
			},function(data){ utilsSvc.tratarErro(data)}
			
			);
		};
		
		_obj.salvar = function() {
			if (isNaN(_scope.obj.id) || _scope.obj.id === '') {
				_scope.criar();
			} else {
				_scope.atualizar();
			}
		};
		
		return _obj;
	})

    ///////////////////////////////////FILTERS//////////////////////////////////////////

    .filter('booleano', function() {
	return function(input) {
		if (input===true) {
			return "Sim";
		} else {
			return "Não";
		}
	};
})
.filter('tipoOperacaoHibernate', function() {
	return function(input) {
		switch(input){
			case 1:
				return 'Modificado';
			case 0:
				return 'Adicionado';
			case 2:
				return 'Removido';	
		}
	};
})
.filter('cpf', function() {
	return function(input) {
		if (input != undefined){
			if (input.length==14){
				//já formatado
				return input;
			} else{
				
				//completa com os zeros eliminados pelo banco
				while (input.length < 11){
					input= '0'+input;
				}		
				
				input=input.replace(/\D/g,"")                 //Remove tudo o que não é dígito
				input=input.replace(/(\d{3})(\d)/,"$1.$2")    //Coloca ponto entre o terceiro e o quarto dígitos
				input=input.replace(/(\d{3})(\d)/,"$1.$2")    //Coloca ponto entre o setimo e o oitava dígitos
				input=input.replace(/(\d{3})(\d)/,"$1-$2")   //Coloca traço entre o decimoprimeiro e o decimosegundo dígitos
				return  input;
			}
		} else {
			return '';
		}
	};
})
.filter('gliphTipoOperacaoHibernate', function() {
	return function(input) {
		switch(input) {
			case 1:
				return 'glyphicon glyphicon-pencil';
			case 0:
				return 'glyphicon glyphicon-saved';
			case 2:
				return 'glyphicon glyphicon-trash';	
		}
	};
})



.filter('valorPadrao', function() {
	return function(input) {
		if(input=="" || input==undefined) {
			return "Não Informado";
		} else {
			return input;
		}
	};
})
.filter('unsafe', ['$sce', function($sce) {
	return function(val) {
		return $sce.trustAsHtml(val);
	};
}])
.filter('tipoMedidaTempo', function() {
	return function(input) {
		switch(input) {
			case 'H':
				return 'Hora(s)';
			case 'M':
				return 'Minuto(s)';
			case 'D':
				return 'Dia(s)';
		}
	};
})
.filter('htmlFilter', function($sce) {
	return function(input) {
		return $sce.trustAsHtml(input);
	};
})
.filter('telefone', function() {
	return function(input) {
		if (input == "" || input == undefined || input.charAt(0) == "N") {
			return "Não Informado";
		} else {
			switch(input.length) {
				case 10:
					return "(" + input.substr(0, 2) + ") " + input.substr(2, 4) + "-" + input.substr(6, 4);
				case 11:
					return "(" + input.substr(0, 2) + ") " + input.substr(2, 5) + "-" + input.substr(7, 4);
				case 9:
				case 14:
				case 15:
					return input;
			}
		}
	};
})

    ///////////////////////////////////SERVICES/////////////////////////////////////////

	.service('roleSvc',function(){	 
		this.isInRole = function(role){		 		 
			if (localStorage.usuarioPerfil === role){			 									
				return true;			 
			}else {							
			   return false;
			}	
	   };
	})
	.service('menuSvc',function(){
		this.alterarMenu = function(){
			var usuario = JSON.parse(localStorage.usuario);		 		 
		   if (usuario.name!==undefined) {
			   $('#linkLogin').hide();
			   $('#UsuarioLogado').show();
			   $('#divMenu').show();			
			   
		   } else {
			   $('#linkLogin').show();
			   $('#UsuarioLogado').hide();
			   $('#divMenu').hide();										
		   }				 
		};	 
	})
	.service('ajudaSvc',function(metaFactory,$rootScope,ngDialog,toastr,$sce,$templateRequest,$compile,$route){
	   
	   //variavel que armazena o template sendo utilizado no momento
	   this.templateModal = '';
	   
	   //função que identifica qual template utilizar 
	   this.buscarTemplateCorrente = function(){
		   var template;
		   
		   //caso exista informa? de template na ajudaSvc, utiliza essa info no lugar do routeProvider. 
		   if (this.templateModal =='' ){
			   template = $route.current.templateUrl;			
		   }else{
			   template = this.templateModal;			
		   }
		   
		   //ajusta o nome do template preservando apenas o nome
		   
		   template = template.substring(6,template.length-5).toLowerCase();
		   
		   return template;
	   }
	   
	   this.exibirAjudaTela = function(escopo){	
		   var template;
		   template = this.buscarTemplateCorrente();	
						   
		   //busca os dados da tela
		   metaFactory['restTelaAjudaTemplateSvc'].get({id:template},function(dataTela){
			   escopo.ajuda = dataTela;
			   if (dataTela.textoAjuda==null){
				   dataTela.textoAjuda = "O texto de ajuda ainda não foi cadastrado.";
			   }
			   escopo.divConteudoTextoAjudaTela = $sce.trustAsHtml(dataTela.textoAjuda);
			   
			   //busca os campos da tela
			   if (dataTela.id != null){
				   metaFactory['restItemAjudaTelaSvc'].query({id:dataTela.id},function(dataCampo){					
					   escopo.ajuda.itensAjuda = dataCampo;
				   });			
			   }
			   escopo.modalAjudaTela = ngDialog.open({
				   template: 'views/ajudaTela.html',
				   scope:escopo,
				   closeByEscape: false
			   });		
		   });	
	   }	
	   
	   //adiciona ao escopo a função de inserir novo item de ajuda
	   this.prepararAjuda = function(escopo,servico){		
		   
		   escopo.manterAjuda =  function(nomeCampo,nomeControlador,rotuloCampo){
			   servico.manterAjuda(nomeCampo,nomeControlador,rotuloCampo);
		   }
		   escopo.exibirAjuda =  function(nomeCampo,nomeControlador,rotuloCampo){			
			   servico.exibirAjuda(nomeCampo,nomeControlador,rotuloCampo);
		   }
		   
		   escopo.exibirAjudaTela =  function(){			
			   servico.exibirAjudaTela(escopo);
		   }
		   
		   escopo.trustAsHtml = $sce.trustAsHtml;
		   
	   }
	   
	   
	   //fun? que abre a modal com as informa?s da ajuda do campo
	   this.exibirAjuda = function(nomeCampo,nomeTemplate,rotuloCampo){			
		   var parent = $rootScope;
		   var novoScopo = parent.$new();
		   var campoTmp = {};
		   campoTmp.campo = nomeCampo;
		   campoTmp.telaAjuda = {};
		   campoTmp.telaAjuda.template = nomeTemplate;		
		   metaFactory['restItemAjudaCampoSvc'].save('',campoTmp,function(data){
			   novoScopo.obj = data;
			   if (data.textoAjuda == null){
				   data.textoAjuda = "Ajuda não cadastrada para o campo " + rotuloCampo + ".";
			   }
			   novoScopo.divConteudoTextoAjuda = $sce.trustAsHtml(data.textoAjuda);
			   novoScopo.rotuloCampo = rotuloCampo;
			   novoScopo.modalDetalhesAjudaCampo = ngDialog.open({
				   template: 'views/ItemAjuda_campo_detalhe.html',				
				   scope: novoScopo,
				   closeByEscape: false				
			   });
		   });
	   }	
	   
	   //fun? chamada quando o usu?o est?om o perfil admin e tenta abrir a ajuda.
	   //exbie a tela de edi? de ajuda
	   this.manterAjuda = function(nomeCampo,nomeTemplate,rotuloCampo){	
	   var parent = $rootScope;
	   var novoScopo = parent.$new();
	   var campoTmp = {};
	   campoTmp.campo = nomeCampo;
	   campoTmp.telaAjuda = {};
	   campoTmp.telaAjuda.template = nomeTemplate;		
	   
	   
	   //recupera os dados da tela
	   metaFactory['restTelaAjudaTemplateSvc'].get({id:this.buscarTemplateCorrente()},function(dataTela){
		   if (dataTela.id == null){
			   toastr.error('Tela não cadastrada.');
		   } else {
			   //recupera as informa?s do campo		
			   metaFactory['restItemAjudaCampoSvc'].save('',campoTmp,function(dataCampo){
				   var objTela = dataTela;
				   novoScopo.telasAjuda = [];
				   novoScopo.telasAjuda.push(objTela);
			   
				   //inicializa as variaveis e já preenche os campos com os valores passados pela função		
				   novoScopo.obj = dataCampo;		
				   novoScopo.campos = [];		
				   novoScopo.obj.campo = nomeCampo;
				   novoScopo.campos.push({nome:nomeCampo,label:rotuloCampo});	
				   novoScopo.obj.telaAjuda= {};
				   novoScopo.obj.telaAjuda.id = objTela.id;
		   
			   });
			   
			   //exibe a modal para editar o campo
			   novoScopo.modalInserirAjuda = ngDialog.open({
				   template: 'views/ItemAjuda_form.html',				
				   scope: novoScopo,
				   className: 'ngdialog-theme-default ngdialog-large'				
			   });
			   
			   var tratarErro = function(data){
				   if (data.status == 499) {
					   var strErro = "<ol>";					
					   var timeOut = 5000;
					   for (var x = 0; x < data.data.length; x++) {
						   strErro += "<li>";
						   strErro += data.data[x];
						   strErro += "</li>";
						   timeOut += 1000;
					   }
					   strErro +="</ol>";
					   toastr.warning(strErro, 'Ocorreram erros de validação', {allowHtml: true, timeOut : timeOut});
				   } else {
					   toastr.error('Erro ao cadastrar item.');
				   }
			   };
   
			   novoScopo.salvarItemAjuda = function (){
				   novoScopo.obj.rotulo =novoScopo.campos[novoScopo.campos.map(function(e) { return e.nome; }).indexOf(novoScopo.obj.campo)].label;
				   if (novoScopo.obj.id == undefined){
					   metaFactory['restItemAjudaSvc'].save(novoScopo.obj, function () {
						   toastr.success('Item cadastrado com sucesso.');
						   ngDialog.close(novoScopo.modalInserirAjuda.id);				
					   }, function (data) {
						   tratarErro(data);
					   });
				   }else{			
					   metaFactory['restItemAjudaSvc'].update({'id':novoScopo.obj.id},novoScopo.obj, function () {
						   toastr.success('Item cadastrado com sucesso.');
						   ngDialog.close(novoScopo.modalInserirAjuda.id);				
					   }, function (data) {
						   tratarErro(data);
					   });
				   }
			   };	
			   
		   
		   }
		   
	   
	   });	
	   } 
	})
	.service('perfilSvc', function(LoginSvc, $rootScope, $location,menuSvc, toastr) {	
	
	
		this.checarLogin = function() {
		   var parent = $rootScope;
		   var novoScopo = parent.$new();
		   var usuario = {};
		   
			if (JSON.parse(localStorage.getItem('usuario'))==null){
				localStorage.usuario=JSON.stringify({});
			}
		   LoginSvc.get({}, function (data){
			   if (data.name === undefined || data.name === '') {
				   localStorage.logado = "false";
				   if ($rootScope.next.indexOf('/login') > -1){
					   //indo para o login				
					   if(localStorage.logado === "true"){									
						   //usuario ja logado. impede de ir para o login
						   if (localStorage.proximaUrl==undefined || localStorage.proximaUrl==""){						
							   
							 $location.path('/');
						   } else {						
							   $location.path(localStorage.proximaUrl.substr(localStorage.proximaUrl.indexOf('#')+1));
						   }					
					   }
				   }else {						
					   if(localStorage.logado === "false"){
						   //usuario n?logado. for?login	
						   localStorage.usuario = JSON.stringify({});
						   localStorage.usuarioPerfil = "";
						   localStorage.logado = "false";	
						   localStorage.perfilSet = undefined;								
						   localStorage.proximaUrl = $rootScope.next;
						   
						   $location.path( '/login' );	
						   $rootScope.usuarioLogado = false;
					   }
				   }
			   }else{
				   usuario = data;				
				   localStorage.usuario = JSON.stringify(usuario);	
				   
				   novoScopo.perfils = [];
				   //preenche a variável de perfils "novoScopo.perfils" sem considerar os perfis do business-central "admin" e "user"
				   
				   for (var i = 0; i < data.roles.length; i++){
					   if (data.roles[i] !== "admin" && data.roles[i] !== "user"){					
						   novoScopo.perfils.push(data.roles[i]);
					   }
				   }
		   
				   if (localStorage.logado === "false"){
					   novoScopo.perfilEscolhido = novoScopo.perfils[0];					
					   if (localStorage.proximaUrl==undefined || localStorage.proximaUrl==""){						
						   
						   $location.path('/');
					   } else {				
						   
						   $location.path(localStorage.proximaUrl.substr(localStorage.proximaUrl.indexOf('#')+1));
					   }
					   localStorage.proximaUrl = "";
					   $rootScope.usuarioLogado = true;
					   localStorage.logado = "true";
					   menuSvc.alterarMenu();
				   }
			   }	
		   }, function() {
			   //tratamento de erro
			   toastr.error('Sistema indisponível. ');
			   localStorage.usuario = JSON.stringify({});
			   localStorage.usuarioPerfil = "";
			   localStorage.logado = "false";	
			   localStorage.perfilSet = undefined;		
			   $location.path( '/login' );
		   });
		   menuSvc.alterarMenu();
		   
		}
   
   })