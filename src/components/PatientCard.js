import React from 'react';
import { MoreHorizontal, Calendar, Clock, Users, UserCircle } from 'lucide-react';

const PatientCard = ({ patient, onEdit, onDelete, onViewSessions }) => {
  const calculateAge = (birthday) => {
    if (!birthday) return null;
    const today = new Date();
    const birthDate = birthday.toDate();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getBirthdayInfo = (birthday) => {
    if (!birthday) return null;

    const today = new Date();
    const birthDate = birthday.toDate();

    // Ajusta para o mesmo ano atual para comparação
    const thisYearBirthday = new Date(birthDate);
    thisYearBirthday.setFullYear(today.getFullYear());

    // Se já passou este ano, ajusta para o próximo
    if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(today.getFullYear() + 1);
    }

    const diffTime = Math.abs(thisYearBirthday - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Se o aniversário é hoje
    if (
        today.getDate() === birthDate.getDate() &&
        today.getMonth() === birthDate.getMonth()
    ) {
        return {
            text: "ANIVERSÁRIO AMANHA!!!",
            type: "soon"
        };
    }

    // Se o aniversário já passou este ano (ou é hoje)
    const lastBirthday = new Date(birthDate);
    lastBirthday.setFullYear(today.getFullYear());

    if (lastBirthday <= today && lastBirthday.getMonth() === today.getMonth()) {
        const daysSince = Math.floor((today - lastBirthday) / (1000 * 60 * 60 * 24));

        if (daysSince === 0) {
            return {
                text: "ANIVERSÁRIO HOJE!",
                type: "today"
            };
        } else {
            return {
                text: `Fez aniversário há ${daysSince} dias`,
                type: "past"
            };
        }
    }


    // Se falta mais de 30 dias
    if (diffDays > 30) {
        const months = Math.floor(diffDays / 30);
        const remainingDays = diffDays % 30;
        return {
            text: `Faltam ${months} ${months > 1 ? 'meses' : 'mês'}${remainingDays > 0 ? ` e ${remainingDays} dias` : ''}`,
            type: "future"
        };
    }

    // Se falta menos de 30 dias
    return {
        text: `Faltam ${diffDays} dias`,
        type: "soon"
    };
};

  const birthdayInfo = getBirthdayInfo(patient.birthday);
  const age = calculateAge(patient.birthday);

  const getBirthdayStyle = (type) => {
    switch (type) {
      case 'today':
        return 'text-emerald-600 font-semibold bg-emerald-50 border-emerald-200';
      case 'past':
        return 'text-red-600 font-semibold bg-red-50 border-red-200';
      case 'soon':
        return 'text-amber-600 font-semibold bg-amber-50 border-amber-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100">
      {/* Cabeçalho com Foto */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
            {patient.photoURL ? (
              <img
                src={patient.photoURL}
                alt={patient.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(patient.name)}&background=random`;
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <UserCircle className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{patient.name}</h3>
            <p className="text-sm text-gray-500">{patient.email}</p>
          </div>

          {/* Menu de Ações */}
          <div className="relative group">
            <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <MoreHorizontal className="w-5 h-5 text-gray-400" />
            </button>
            
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
              <div className="py-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewSessions(patient);
                  }}
                  className="w-full px-4 py-2.5 text-sm bg-transparent hover:bg-teal-50 text-left flex items-center gap-2 text-teal-700 hover:text-teal-800 font-medium"
                >
                  <Users className="w-4 h-4" />
                  Ver Sessões
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(patient);
                  }}
                  className="w-full px-4 py-2.5 text-sm bg-transparent hover:bg-blue-50 text-left flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Calendar className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(patient.id);
                  }}
                  className="w-full px-4 py-2.5 text-sm bg-transparent hover:bg-red-50 text-left flex items-center gap-2 text-red-500 hover:text-red-600 font-medium border-t border-gray-100"
                >
                  <Clock className="w-4 h-4" />
                  Remover
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Informações do Paciente */}
      <div className="p-4 space-y-3">
        {/* Idade */}
        {age !== null && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Idade:</span>
            <span className="text-sm font-medium text-gray-900">{age} anos</span>
          </div>
        )}

        {/* Aniversário */}
        {birthdayInfo && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Aniversário:</span>
            <span className={`text-sm px-2 py-0.5 rounded-full border ${getBirthdayStyle(birthdayInfo.type)}`}>
              {birthdayInfo.text}
            </span>
          </div>
        )}

        {/* Total de Sessões */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Total de sessões:</span>
          <span className="text-sm font-medium text-gray-900">
            {patient.sessionsCount || 0}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PatientCard;